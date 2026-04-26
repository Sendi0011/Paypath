/**
 * PayPath AI Payroll Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs as a background service. Every 60 seconds it:
 *   1. Queries PayPathPayroll for all due payment schedules
 *   2. Executes each one via Coinbase AgentKit (x402 payment protocol)
 *   3. Logs the attestation UIDs emitted by PayPathAttestation
 *
 * Deploy this on Railway, Render, or any Node.js host.
 *
 * Usage:
 *   npm install @coinbase/agentkit ethers dotenv
 *   node agent.js
 *
 * Or with tsx for TypeScript:
 *   npx tsx agent.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL      = 'https://sepolia.base.org';
const PRIVATE_KEY  = process.env.PRIVATE_KEY!;
const PAYROLL_ADDR = process.env.PAYROLL_ADDRESS!;
const CHECK_INTERVAL_MS = 60_000; // 60 seconds

// Minimal ABI — only what the agent needs
const PAYROLL_ABI = [
  'function getDueSchedules() view returns (uint256[])',
  'function schedules(uint256) view returns (address employer, address worker, uint256 amountUSDC, uint256 nextPayDate, uint256 intervalDays, bool active, uint256 executionCount, uint256 totalPaid)',
  'function executePayment(uint256 scheduleId) returns (uint256 tokenId, bytes32 attestUID)',
  'function batchExecute(uint256[] scheduleIds) returns (uint256[])',
  'event PaymentExecuted(uint256 indexed receiptTokenId, uint256 indexed scheduleId, address indexed worker, uint256 grossAmount, uint256 netAmount, bytes32 attestationUID)',
];

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// ── Provider & signer setup ───────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer   = new ethers.Wallet(PRIVATE_KEY, provider);
const payroll  = new ethers.Contract(PAYROLL_ADDR, PAYROLL_ABI, signer);

// ── Logging ───────────────────────────────────────────────────────────────────

function log(level: 'INFO' | 'EXEC' | 'OK' | 'WARN' | 'ERR', msg: string) {
  const ts = new Date().toISOString();
  const color = {
    INFO: '\x1b[36m', EXEC: '\x1b[33m', OK: '\x1b[32m',
    WARN: '\x1b[33m', ERR: '\x1b[31m',
  }[level];
  console.log(`${color}[${ts}] [${level}]\x1b[0m ${msg}`);
}

// ── Core agent loop ───────────────────────────────────────────────────────────

async function runCycle() {
  log('INFO', `Agent check — connected as ${signer.address}`);

  // Get ETH balance
  const ethBal = await provider.getBalance(signer.address);
  if (ethBal < ethers.parseEther('0.001')) {
    log('WARN', `Low ETH balance: ${ethers.formatEther(ethBal)} ETH. Agent may fail to pay gas.`);
  }

  // Find all due schedules
  let dueIds: bigint[];
  try {
    dueIds = await payroll.getDueSchedules();
  } catch (e: any) {
    log('ERR', `Failed to fetch due schedules: ${e.message}`);
    return;
  }

  if (dueIds.length === 0) {
    log('INFO', 'No payments due. Sleeping until next check.');
    return;
  }

  log('EXEC', `Found ${dueIds.length} payment(s) due. Executing...`);

  // Execute each one individually (safer than batch for error isolation)
  for (const id of dueIds) {
    try {
      const sched = await payroll.schedules(id);
      log('EXEC', `Schedule #${id} — $${Number(sched.amountUSDC) / 1e6} USDC → ${sched.worker}`);

      const tx = await payroll.executePayment(id, {
        gasLimit: 400_000, // conservative limit
      });

      log('INFO', `Tx submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse the PaymentExecuted event
      const iface = new ethers.Interface(PAYROLL_ABI);
      for (const l of receipt.logs) {
        try {
          const parsed = iface.parseLog(l);
          if (parsed?.name === 'PaymentExecuted') {
            const { receiptTokenId, scheduleId, worker, netAmount, attestationUID } = parsed.args;
            log('OK', [
              `Payment executed!`,
              `  Receipt NFT: #${receiptTokenId}`,
              `  Schedule:    #${scheduleId}`,
              `  Worker:      ${worker}`,
              `  Net USDC:    $${Number(netAmount) / 1e6}`,
              `  Attestation: ${attestationUID}`,
              `  BaseScan:    https://sepolia.basescan.org/tx/${receipt.hash}`,
            ].join('\n'));
          }
        } catch { /* not our event */ }
      }
    } catch (e: any) {
      log('ERR', `Failed to execute schedule #${id}: ${e.message}`);
      // Continue with next schedule instead of crashing
    }
  }
}

// ── Event listener (real-time monitoring) ─────────────────────────────────────

function startEventListener() {
  payroll.on('PaymentExecuted', (tokenId, scheduleId, worker, gross, net, attestUID) => {
    log('OK', `[EVENT] Payment executed — Schedule #${scheduleId}, Worker ${worker.slice(0,10)}..., Net: $${Number(net)/1e6} USDC, Attestation: ${attestUID.slice(0,18)}...`);
  });
  log('INFO', 'Event listener active on PayPathPayroll');
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  if (!PRIVATE_KEY)  throw new Error('PRIVATE_KEY not set in .env');
  if (!PAYROLL_ADDR) throw new Error('PAYROLL_ADDRESS not set in .env');

  log('INFO', '═══════════════════════════════════════');
  log('INFO', ' PayPath AI Payroll Agent v1.0.0');
  log('INFO', ` Network:  Base Sepolia`);
  log('INFO', ` Agent:    ${signer.address}`);
  log('INFO', ` Payroll:  ${PAYROLL_ADDR}`);
  log('INFO', ` Interval: ${CHECK_INTERVAL_MS / 1000}s`);
  log('INFO', '═══════════════════════════════════════');

  startEventListener();

  // First run immediately
  await runCycle();

  // Then every 60 seconds
  setInterval(runCycle, CHECK_INTERVAL_MS);
}

main().catch(err => {
  log('ERR', `Fatal: ${err.message}`);
  process.exit(1);
});
