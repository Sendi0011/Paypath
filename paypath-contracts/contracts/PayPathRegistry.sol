// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PayPathRegistry
 * @notice Central registry for PayPath employers and workers.
 *         Also stores authorized AgentKit agent addresses per employer.
 */
contract PayPathRegistry is Ownable, ReentrancyGuard {

    struct Employer {
        address wallet;
        string  basename;
        bool    verified;
        uint256 totalPaid;     // cumulative USDC (6 decimals)
        uint256 registeredAt;
    }

    struct Worker {
        address wallet;
        string  basename;
        uint256 totalReceived;
        uint256 monthsActive;
        bool    creditEligible;
        uint256 registeredAt;
    }

    mapping(address => Employer)            public employers;
    mapping(address => Worker)              public workers;
    // agent address => employer address that authorized it
    mapping(address => address)             public agentToEmployer;
    mapping(address => address[])           public employerAgents;

    event EmployerRegistered(address indexed employer, string basename);
    event WorkerRegistered(address indexed worker, string basename);
    event AgentAuthorized(address indexed agent, address indexed employer);
    event AgentRevoked(address indexed agent, address indexed employer);

    constructor() Ownable(msg.sender) {}

    // ── Registration ─────────────────────────────────────────────────────────

    function registerEmployer(string calldata basename) external {
        require(bytes(basename).length > 0, "Basename required");
        require(!employers[msg.sender].verified, "Already registered");
        employers[msg.sender] = Employer({
            wallet: msg.sender,
            basename: basename,
            verified: true,
            totalPaid: 0,
            registeredAt: block.timestamp
        });
        emit EmployerRegistered(msg.sender, basename);
    }

    function registerWorker(string calldata basename) external {
        require(bytes(basename).length > 0, "Basename required");
        require(workers[msg.sender].wallet == address(0), "Already registered");
        workers[msg.sender] = Worker({
            wallet: msg.sender,
            basename: basename,
            totalReceived: 0,
            monthsActive: 0,
            creditEligible: false,
            registeredAt: block.timestamp
        });
        emit WorkerRegistered(msg.sender, basename);
    }

    // ── Agent authorization ──────────────────────────────────────────────────

    /// @notice Employer authorizes an AgentKit agent to pay on their behalf
    function authorizeAgent(address agent) external {
        require(employers[msg.sender].verified, "Not a registered employer");
        require(agent != address(0), "Invalid agent");
        agentToEmployer[agent] = msg.sender;
        employerAgents[msg.sender].push(agent);
        emit AgentAuthorized(agent, msg.sender);
    }

    function revokeAgent(address agent) external {
        require(agentToEmployer[agent] == msg.sender, "Not your agent");
        agentToEmployer[agent] = address(0);
        emit AgentRevoked(agent, msg.sender);
    }

    // ── Internal helpers called by PayPathPayroll ────────────────────────────

    function incrementWorkerStats(
        address worker,
        uint256 amountUSDC,
        bool    newMonth
    ) external {
        // Only callable by the payroll contract (set by owner)
        require(msg.sender == payrollContract, "Unauthorized");
        workers[worker].totalReceived += amountUSDC;
        if (newMonth) {
            workers[worker].monthsActive += 1;
            if (workers[worker].monthsActive >= 3) {
                workers[worker].creditEligible = true;
            }
        }
    }

    function incrementEmployerStats(address employer, uint256 amountUSDC) external {
        require(msg.sender == payrollContract, "Unauthorized");
        employers[employer].totalPaid += amountUSDC;
    }

    // ── Payroll contract reference ───────────────────────────────────────────

    address public payrollContract;

    function setPayrollContract(address _payroll) external onlyOwner {
        payrollContract = _payroll;
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function isAuthorized(address caller, address employer) external view returns (bool) {
        if (caller == employer && employers[employer].verified) return true;
        if (agentToEmployer[caller] == employer) return true;
        return false;
    }

    function getEmployerAgents(address employer) external view returns (address[] memory) {
        return employerAgents[employer];
    }
}
