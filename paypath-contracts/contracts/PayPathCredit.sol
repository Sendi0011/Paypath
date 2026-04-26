// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PayPathAttestation.sol";

/**
 * @title PayPathCredit
 * @notice DeFi credit line for verified PayPath workers.
 *
 *   Eligibility: 3+ months of verified income AND $500+ total earned (checked via PayPathAttestation)
 *   Credit limit: 30% of 3-month average income
 *   Rate:         4% APR simple interest (pre-computed for 30-day term)
 *   Term:         30 days
 *   Collateral:   EAS income attestation (non-custodial — no assets locked)
 *
 * The contract holds a USDC treasury funded by the PayPath team / investors.
 * Revenue (interest + fees) flows back into this treasury.
 */
contract PayPathCredit is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ── Constants & config ────────────────────────────────────────────────────

    IERC20  public immutable USDC;
    PayPathAttestation public immutable attestation;

    uint256 public constant RATE_BPS     = 400;    // 4% annual in bps
    uint256 public constant TERM_SECONDS = 30 days;
    uint256 public constant MIN_BORROW   = 10e6;   // $10 USDC minimum

    // ── Loan storage ──────────────────────────────────────────────────────────

    struct Loan {
        uint256 principal;      // USDC borrowed (6 decimals)
        uint256 interestOwed;   // pre-computed simple interest
        uint256 issuedAt;
        uint256 dueDate;
        bool    repaid;
    }

    mapping(address => Loan) public loans;
    mapping(address => bool) public hasActiveLoan;

    // ── Counters ──────────────────────────────────────────────────────────────

    uint256 public totalBorrowed;
    uint256 public totalRepaid;
    uint256 public totalInterestEarned;
    uint256 public activeLoanCount;

    // ── Events ────────────────────────────────────────────────────────────────

    event LoanIssued(
        address indexed worker,
        uint256 principal,
        uint256 interestOwed,
        uint256 dueDate
    );
    event LoanRepaid(
        address indexed worker,
        uint256 principal,
        uint256 interest,
        bool    onTime
    );
    event LoanDefaulted(address indexed worker, uint256 principal);
    event TreasuryFunded(address indexed funder, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _usdc, address _attestation) Ownable(msg.sender) {
        USDC        = IERC20(_usdc);
        attestation = PayPathAttestation(_attestation);
    }

    // ── Borrower functions ────────────────────────────────────────────────────

    /**
     * @notice Worker requests a USDC loan against their income attestation.
     * @param requestedUSDC Amount in 6-decimal USDC units (e.g. 100e6 = $100)
     */
    function borrow(uint256 requestedUSDC) external nonReentrant {
        require(!hasActiveLoan[msg.sender], "PayPathCredit: existing loan outstanding");
        require(
            attestation.isCreditEligible(msg.sender),
            "PayPathCredit: not credit eligible — need 3 months + $500 earned"
        );
        require(requestedUSDC >= MIN_BORROW, "PayPathCredit: below minimum ($10)");

        uint256 limit = attestation.getCreditLimit(msg.sender);
        require(requestedUSDC <= limit, "PayPathCredit: exceeds credit limit");

        // Ensure treasury has enough
        require(
            USDC.balanceOf(address(this)) >= requestedUSDC,
            "PayPathCredit: insufficient treasury liquidity"
        );

        // Pre-compute 30-day simple interest
        // interest = principal × rate × days / (365 × 10000)
        uint256 interest = (requestedUSDC * RATE_BPS * 30) / (365 * 10000);

        uint256 due = block.timestamp + TERM_SECONDS;

        loans[msg.sender] = Loan({
            principal:    requestedUSDC,
            interestOwed: interest,
            issuedAt:     block.timestamp,
            dueDate:      due,
            repaid:       false
        });
        hasActiveLoan[msg.sender] = true;

        totalBorrowed    += requestedUSDC;
        activeLoanCount  += 1;

        USDC.safeTransfer(msg.sender, requestedUSDC);

        emit LoanIssued(msg.sender, requestedUSDC, interest, due);
    }

    /**
     * @notice Worker repays their outstanding loan (principal + interest).
     * @dev Worker must have approved this contract to spend USDC.
     */
    function repay() external nonReentrant {
        require(hasActiveLoan[msg.sender], "PayPathCredit: no active loan");
        Loan storage loan = loans[msg.sender];
        require(!loan.repaid, "PayPathCredit: already repaid");

        uint256 total = loan.principal + loan.interestOwed;

        // Pull repayment from worker
        USDC.safeTransferFrom(msg.sender, address(this), total);

        bool onTime = block.timestamp <= loan.dueDate;

        loan.repaid      = true;
        hasActiveLoan[msg.sender] = false;

        totalRepaid         += loan.principal;
        totalInterestEarned += loan.interestOwed;
        activeLoanCount     -= 1;

        emit LoanRepaid(msg.sender, loan.principal, loan.interestOwed, onTime);
    }

    /**
     * @notice Mark an overdue loan as defaulted. Only owner (or keeper) can call.
     * @dev In production, this would trigger a reputation slash on the income passport.
     */
    function markDefault(address worker) external onlyOwner {
        require(hasActiveLoan[worker], "No active loan");
        Loan storage loan = loans[worker];
        require(!loan.repaid, "Already repaid");
        require(block.timestamp > loan.dueDate + 7 days, "Grace period not over");

        uint256 principal = loan.principal;
        loan.repaid = true;
        hasActiveLoan[worker] = false;
        activeLoanCount -= 1;

        emit LoanDefaulted(worker, principal);
    }

    // ── Treasury ──────────────────────────────────────────────────────────────

    function fundTreasury(uint256 amount) external {
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        emit TreasuryFunded(msg.sender, amount);
    }

    function withdrawTreasury(uint256 amount, address to) external onlyOwner {
        // Cannot withdraw active loans
        uint256 minBalance = totalBorrowed - totalRepaid;
        require(
            USDC.balanceOf(address(this)) - amount >= minBalance,
            "PayPathCredit: would under-collateralize"
        );
        USDC.safeTransfer(to, amount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getLoan(address worker) external view returns (Loan memory) {
        return loans[worker];
    }

    function availableCredit(address worker) external view returns (uint256) {
        if (hasActiveLoan[worker]) return 0;
        if (!attestation.isCreditEligible(worker)) return 0;
        return attestation.getCreditLimit(worker);
    }

    function treasuryBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    function isOverdue(address worker) external view returns (bool) {
        if (!hasActiveLoan[worker]) return false;
        return block.timestamp > loans[worker].dueDate;
    }
}
