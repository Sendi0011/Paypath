// Contract addresses (Base Sepolia testnet for demo, Base mainnet for production)
export const CONTRACTS = {
  REGISTRY:    '0x0000000000000000000000000000000000000001', // deploy & update
  PAYROLL:     '0x0000000000000000000000000000000000000002',
  ATTESTATION: '0x0000000000000000000000000000000000000003',
  CREDIT:      '0x0000000000000000000000000000000000000004',
  USDC:        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet USDC
  USDC_SEPOLIA:'0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
};

export const REGISTRY_ABI = [
  'function registerEmployer(string basename) external',
  'function registerWorker(string basename) external',
  'function authorizeAgent(address agent) external',
  'function employers(address) view returns (address wallet, string basename, bool verified, uint256 totalPaid)',
  'function workers(address) view returns (address wallet, string basename, uint256 totalReceived, uint256 monthsActive, bool creditEligible)',
  'event EmployerRegistered(address indexed employer, string basename)',
  'event WorkerRegistered(address indexed worker, string basename)',
];

export const PAYROLL_ABI = [
  'function createSchedule(address worker, uint256 amountUSDC, uint256 firstPayDate, uint256 intervalDays) external returns (uint256)',
  'function executePayment(uint256 scheduleId) external',
  'function cancelSchedule(uint256 scheduleId) external',
  'function schedules(uint256) view returns (address employer, address worker, uint256 amountUSDC, uint256 nextPayDate, uint256 intervalDays, bool active)',
  'function scheduleCount() view returns (uint256)',
  'function receipts(uint256) view returns (address employer, address worker, uint256 amountUSDC, uint256 paidAt, uint256 scheduleId)',
  'event ScheduleCreated(uint256 indexed scheduleId, address employer, address worker, uint256 amount)',
  'event PaymentExecuted(uint256 indexed receiptTokenId, uint256 indexed scheduleId, uint256 amount)',
];

export const ATTESTATION_ABI = [
  'function profiles(address) view returns (uint256 totalUSDC, uint256 monthsActive, uint256 lastPaymentTimestamp, uint256 paymentCount, bytes32 latestAttestationUID)',
  'function isCreditEligible(address worker) view returns (bool)',
  'event IncomeAttested(address indexed worker, bytes32 uid, uint256 totalUSDC, uint256 months)',
];

export const CREDIT_ABI = [
  'function borrow(uint256 requestedUSDC) external',
  'function repay() external',
  'function creditLimit(address worker) view returns (uint256)',
  'function loans(address) view returns (uint256 principal, uint256 interestOwed, uint256 dueDate, bool repaid)',
  'function hasActiveLoan(address) view returns (bool)',
  'event LoanIssued(address indexed worker, uint256 principal, uint256 due)',
  'event LoanRepaid(address indexed worker, uint256 totalRepaid)',
];

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];
