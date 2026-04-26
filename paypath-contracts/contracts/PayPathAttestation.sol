// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PayPathAttestation
 * @notice Wraps EAS (Ethereum Attestation Service) to build a tamper-proof
 *         income history for each PayPath worker. This is the "Income Passport".
 *
 * EAS on Base: 0x4200000000000000000000000000000000000021
 * SchemaRegistry on Base: 0x4200000000000000000000000000000000000020
 */

interface IEAS {
    struct AttestationRequest {
        bytes32 schema;
        AttestationRequestData data;
    }
    struct AttestationRequestData {
        address recipient;
        uint64  expirationTime;
        bool    revocable;
        bytes32 refUID;
        bytes   data;
        uint256 value;
    }
    function attest(AttestationRequest calldata request)
        external payable returns (bytes32 uid);
}

interface ISchemaRegistry {
    function register(
        string calldata schema,
        address resolver,
        bool revocable
    ) external returns (bytes32 uid);
}

contract PayPathAttestation {

    // ── Constants ────────────────────────────────────────────────────────────

    IEAS public constant EAS =
        IEAS(0x4200000000000000000000000000000000000021);

    ISchemaRegistry public constant SCHEMA_REGISTRY =
        ISchemaRegistry(0x4200000000000000000000000000000000000020);

    // Schema: worker address, totalUSDC earned, monthsActive, lastPayment timestamp
    // Registered once at deployment, UID stored here
    bytes32 public INCOME_SCHEMA_UID;
    string  public constant SCHEMA_STRING =
        "address worker,uint256 totalUSDC,uint256 monthsActive,uint256 lastPaymentTimestamp,uint256 paymentCount";

    // ── State ────────────────────────────────────────────────────────────────

    address public payrollContract;
    address public owner;

    struct IncomeProfile {
        uint256 totalUSDC;
        uint256 monthsActive;
        uint256 lastPaymentTimestamp;
        uint256 paymentCount;
        bytes32 latestAttestationUID;
        uint256 lastMonthCountedTimestamp;  // tracks when we last incremented months
    }

    mapping(address => IncomeProfile) public profiles;

    // ── Events ───────────────────────────────────────────────────────────────

    event IncomeAttested(
        address indexed worker,
        bytes32 indexed uid,
        uint256 totalUSDC,
        uint256 monthsActive,
        uint256 paymentCount
    );
    event SchemaRegistered(bytes32 indexed uid);
    event PayrollContractSet(address indexed payroll);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Setup ─────────────────────────────────────────────────────────────────

    /// @notice Register the income schema on EAS. Call once after deployment.
    function registerSchema() external returns (bytes32 uid) {
        require(msg.sender == owner, "Only owner");
        require(INCOME_SCHEMA_UID == bytes32(0), "Already registered");
        uid = SCHEMA_REGISTRY.register(
            SCHEMA_STRING,
            address(0), // no resolver
            false       // non-revocable — income history cannot be deleted
        );
        INCOME_SCHEMA_UID = uid;
        emit SchemaRegistered(uid);
    }

    function setPayrollContract(address _payroll) external {
        require(msg.sender == owner, "Only owner");
        payrollContract = _payroll;
        emit PayrollContractSet(_payroll);
    }

    // ── Core function ─────────────────────────────────────────────────────────

    /**
     * @notice Called by PayPathPayroll after every successful USDC payment.
     *         Updates the worker's income profile and issues a new EAS attestation.
     * @param worker      Worker's wallet address
     * @param amountUSDC  Payment amount in 6-decimal USDC units
     */
    function recordPayment(address worker, uint256 amountUSDC) external returns (bytes32 uid) {
        require(msg.sender == payrollContract, "Only payroll contract");
        require(worker != address(0), "Invalid worker");
        require(amountUSDC > 0, "Zero amount");

        IncomeProfile storage p = profiles[worker];
        p.totalUSDC   += amountUSDC;
        p.paymentCount += 1;

        // Count a new "month" if at least 25 days have passed since the last count
        // (allows some slack for early/late payments)
        bool newMonth = false;
        if (
            p.lastMonthCountedTimestamp == 0 ||
            block.timestamp >= p.lastMonthCountedTimestamp + 25 days
        ) {
            p.monthsActive += 1;
            p.lastMonthCountedTimestamp = block.timestamp;
            newMonth = true;
        }

        p.lastPaymentTimestamp = block.timestamp;

        // Encode attestation data
        bytes memory encodedData = abi.encode(
            worker,
            p.totalUSDC,
            p.monthsActive,
            block.timestamp,
            p.paymentCount
        );

        // Issue EAS attestation (non-revocable, no expiry)
        uid = EAS.attest(
            IEAS.AttestationRequest({
                schema: INCOME_SCHEMA_UID,
                data: IEAS.AttestationRequestData({
                    recipient:      worker,
                    expirationTime: 0,
                    revocable:      false,
                    refUID:         p.latestAttestationUID, // chain of attestations
                    data:           encodedData,
                    value:          0
                })
            })
        );

        p.latestAttestationUID = uid;

        emit IncomeAttested(worker, uid, p.totalUSDC, p.monthsActive, p.paymentCount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /**
     * @notice Returns true if the worker qualifies for DeFi credit:
     *         3+ months of income AND at least $500 total earned.
     */
    function isCreditEligible(address worker) external view returns (bool) {
        IncomeProfile memory p = profiles[worker];
        return p.monthsActive >= 3 && p.totalUSDC >= 500 * 1e6;
    }

    /**
     * @notice Maximum USDC the worker can borrow (30% of 3-month average income)
     */
    function getCreditLimit(address worker) external view returns (uint256) {
        IncomeProfile memory p = profiles[worker];
        if (p.monthsActive < 3) return 0;
        uint256 monthlyAvg = p.totalUSDC / p.monthsActive;
        return (monthlyAvg * 3 * 3000) / 10000; // 30% of 3-month income
    }

    /**
     * @notice Returns the full income profile for a worker
     */
    function getProfile(address worker)
        external view
        returns (
            uint256 totalUSDC,
            uint256 monthsActive,
            uint256 lastPaymentTimestamp,
            uint256 paymentCount,
            bytes32 latestAttestationUID
        )
    {
        IncomeProfile memory p = profiles[worker];
        return (
            p.totalUSDC,
            p.monthsActive,
            p.lastPaymentTimestamp,
            p.paymentCount,
            p.latestAttestationUID
        );
    }
}
