// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PayPathRegistry.sol";
import "./PayPathAttestation.sol";

/**
 * @title PayPathPayroll
 * @notice Core payroll engine. Handles:
 *   1. Employer-defined payment schedules (amount, interval, worker)
 *   2. USDC disbursement (pulled from employer wallet via ERC20 allowance)
 *   3. Receipt NFT minting for every payment (worker gets a permanent record)
 *   4. Triggering income attestation on PayPathAttestation after each payment
 *
 * Can be called by the employer directly OR by an authorized AgentKit agent.
 *
 * USDC on Base mainnet:  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 * USDC on Base Sepolia:  0x036CbD53842c5426634e7929541eC2318f3dCF7e
 */
contract PayPathPayroll is ERC721, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ── Immutables ────────────────────────────────────────────────────────────

    IERC20  public immutable USDC;
    PayPathRegistry    public immutable registry;
    PayPathAttestation public immutable attestation;

    // ── Fee ──────────────────────────────────────────────────────────────────

    uint256 public feeBps = 150; // 1.5% in basis points
    address public feeRecipient;

    // ── Schedule storage ─────────────────────────────────────────────────────

    struct PaymentSchedule {
        address employer;
        address worker;
        uint256 amountUSDC;    // gross amount (fee deducted on execution)
        uint256 nextPayDate;   // unix timestamp
        uint256 intervalDays;  // 7, 14, or 30
        bool    active;
        uint256 executionCount;
        uint256 totalPaid;     // net USDC disbursed to worker (cumulative)
    }

    struct PaymentReceipt {
        address employer;
        address worker;
        uint256 grossAmount;  // what employer paid
        uint256 netAmount;    // what worker received
        uint256 fee;          // protocol fee
        uint256 paidAt;
        uint256 scheduleId;
        bytes32 attestationUID;
    }

    mapping(uint256 => PaymentSchedule) public schedules;
    mapping(uint256 => PaymentReceipt)  public receipts;

    uint256 public scheduleCount;
    uint256 private _nextTokenId;

    // Token URI base
    string private _baseTokenURI;

    // ── Events ────────────────────────────────────────────────────────────────

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed employer,
        address indexed worker,
        uint256 amountUSDC,
        uint256 intervalDays
    );
    event PaymentExecuted(
        uint256 indexed receiptTokenId,
        uint256 indexed scheduleId,
        address indexed worker,
        uint256 grossAmount,
        uint256 netAmount,
        bytes32 attestationUID
    );
    event ScheduleCancelled(uint256 indexed scheduleId);
    event FeeUpdated(uint256 newFeeBps);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _usdc,
        address _registry,
        address _attestation,
        address _feeRecipient
    )
        ERC721("PayPath Payment Receipt", "PPRCT")
        Ownable(msg.sender)
    {
        USDC         = IERC20(_usdc);
        registry     = PayPathRegistry(_registry);
        attestation  = PayPathAttestation(_attestation);
        feeRecipient = _feeRecipient;
    }

    // ── Schedule management ───────────────────────────────────────────────────

    /**
     * @notice Create a new payment schedule.
     * @dev Caller must be a registered employer OR an authorized agent.
     *      Employer must have approved this contract to spend USDC.
     */
    function createSchedule(
        address employer,
        address worker,
        uint256 amountUSDC,
        uint256 firstPayDate,
        uint256 intervalDays
    ) external returns (uint256 scheduleId) {
        require(
            registry.isAuthorized(msg.sender, employer),
            "PayPath: not authorized"
        );
        require(amountUSDC >= 1e6, "PayPath: minimum $1 USDC");
        require(
            intervalDays == 7 || intervalDays == 14 || intervalDays == 30,
            "PayPath: invalid interval (7/14/30)"
        );
        require(firstPayDate >= block.timestamp, "PayPath: pay date in past");

        // Verify worker is registered
        (address wWallet,,,,,) = _workerData(worker);
        require(wWallet != address(0), "PayPath: worker not registered");

        scheduleId = scheduleCount++;
        schedules[scheduleId] = PaymentSchedule({
            employer:       employer,
            worker:         worker,
            amountUSDC:     amountUSDC,
            nextPayDate:    firstPayDate,
            intervalDays:   intervalDays,
            active:         true,
            executionCount: 0,
            totalPaid:      0
        });

        emit ScheduleCreated(scheduleId, employer, worker, amountUSDC, intervalDays);
    }

    /**
     * @notice Execute a payment for a given schedule.
     * @dev Anyone can call this once the pay date has passed (keeper-compatible).
     *      The AgentKit agent will be the primary caller in production.
     */
    function executePayment(uint256 scheduleId)
        external
        nonReentrant
        returns (uint256 tokenId, bytes32 attestUID)
    {
        PaymentSchedule storage sched = schedules[scheduleId];

        require(sched.active,                          "PayPath: schedule inactive");
        require(block.timestamp >= sched.nextPayDate,  "PayPath: not yet due");

        uint256 gross = sched.amountUSDC;
        uint256 fee   = (gross * feeBps) / 10000;
        uint256 net   = gross - fee;

        // ── Transfer USDC ────────────────────────────────────────────────────
        // Pull full gross from employer
        USDC.safeTransferFrom(sched.employer, address(this), gross);
        // Send net to worker
        USDC.safeTransfer(sched.worker, net);
        // Send fee to protocol
        if (fee > 0) {
            USDC.safeTransfer(feeRecipient, fee);
        }

        // ── Update schedule ──────────────────────────────────────────────────
        sched.nextPayDate    += sched.intervalDays * 1 days;
        sched.executionCount += 1;
        sched.totalPaid      += net;

        // ── Mint receipt NFT to worker ───────────────────────────────────────
        tokenId = _nextTokenId++;
        _safeMint(sched.worker, tokenId);

        // ── Issue EAS attestation ────────────────────────────────────────────
        attestUID = attestation.recordPayment(sched.worker, net);

        // ── Store receipt ────────────────────────────────────────────────────
        receipts[tokenId] = PaymentReceipt({
            employer:       sched.employer,
            worker:         sched.worker,
            grossAmount:    gross,
            netAmount:      net,
            fee:            fee,
            paidAt:         block.timestamp,
            scheduleId:     scheduleId,
            attestationUID: attestUID
        });

        // ── Update registry stats ─────────────────────────────────────────────
        registry.incrementWorkerStats(sched.worker, net, sched.executionCount % 4 == 0);
        registry.incrementEmployerStats(sched.employer, gross);

        emit PaymentExecuted(tokenId, scheduleId, sched.worker, gross, net, attestUID);
    }

    /**
     * @notice Batch execute multiple due schedules in one tx.
     *         Useful for the AgentKit agent to process all pending payments.
     */
    function batchExecute(uint256[] calldata scheduleIds)
        external
        returns (uint256[] memory tokenIds)
    {
        tokenIds = new uint256[](scheduleIds.length);
        for (uint256 i = 0; i < scheduleIds.length; i++) {
            PaymentSchedule memory s = schedules[scheduleIds[i]];
            if (s.active && block.timestamp >= s.nextPayDate) {
                (tokenIds[i], ) = this.executePayment(scheduleIds[i]);
            }
        }
    }

    function cancelSchedule(uint256 scheduleId) external {
        PaymentSchedule storage sched = schedules[scheduleId];
        require(
            registry.isAuthorized(msg.sender, sched.employer),
            "PayPath: not authorized"
        );
        sched.active = false;
        emit ScheduleCancelled(scheduleId);
    }

    // ── Fee management ────────────────────────────────────────────────────────

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "PayPath: fee too high"); // max 5%
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    // ── NFT metadata ──────────────────────────────────────────────────────────

    function setBaseURI(string calldata uri) external onlyOwner {
        _baseTokenURI = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        PaymentReceipt memory r = receipts[tokenId];
        // Return on-chain JSON if no base URI set
        if (bytes(_baseTokenURI).length == 0) {
            return string(abi.encodePacked(
                'data:application/json;utf8,{"name":"PayPath Receipt #',
                _toString(tokenId),
                '","description":"Verified USDC payment on Base","attributes":[',
                '{"trait_type":"Amount USDC","value":"', _toString(r.netAmount / 1e6), '"},',
                '{"trait_type":"Employer","value":"', _toHexString(r.employer), '"},',
                '{"trait_type":"Worker","value":"',  _toHexString(r.worker),   '"}',
                ']}'
            ));
        }
        return super.tokenURI(tokenId);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getDueSchedules() external view returns (uint256[] memory due) {
        uint256 count = 0;
        for (uint256 i = 0; i < scheduleCount; i++) {
            if (schedules[i].active && block.timestamp >= schedules[i].nextPayDate) count++;
        }
        due = new uint256[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < scheduleCount; i++) {
            if (schedules[i].active && block.timestamp >= schedules[i].nextPayDate) due[j++] = i;
        }
    }

    function getEmployerSchedules(address employer)
        external view
        returns (uint256[] memory ids)
    {
        uint256 count = 0;
        for (uint256 i = 0; i < scheduleCount; i++) {
            if (schedules[i].employer == employer) count++;
        }
        ids = new uint256[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < scheduleCount; i++) {
            if (schedules[i].employer == employer) ids[j++] = i;
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _workerData(address worker)
        internal view
        returns (address, string memory, uint256, uint256, bool, uint256)
    {
        return (
            registry.workers(worker).wallet,
            registry.workers(worker).basename,
            registry.workers(worker).totalReceived,
            registry.workers(worker).monthsActive,
            registry.workers(worker).creditEligible,
            registry.workers(worker).registeredAt
        );
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(42);
        buffer[0] = '0'; buffer[1] = 'x';
        bytes16 HEX = "0123456789abcdef";
        uint160 value = uint160(addr);
        for (uint256 i = 41; i >= 2; i--) {
            buffer[i] = HEX[value & 0xf];
            value >>= 4;
        }
        return string(buffer);
    }
}
