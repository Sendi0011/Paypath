# PayPath — Onchain Payroll for the Global Gig Economy
### Base Batches 2026 · Student Track

> AI-powered USDC payroll · Verifiable income passport · Instant DeFi credit  
> Built on Base · Coinbase AgentKit · EAS Attestations · Basenames

---

## Live Demo

- **Landing:**   `/`         — hero, how it works, features, social proof
- **Onboard:**   `/onboard`  — role selection (employer or worker)
- **Employer:**  `/employer` — payroll dashboard, AI agent, analytics
- **Worker:**    `/worker`   — income passport, payment history, credit line

---

## Quick Start (Frontend)

```bash
npm install
npm start           # http://localhost:3000
npm run build       # production bundle
```

Copy `.env.example` to `.env` and fill in deployed contract addresses.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  Landing · Onboard · EmployerDashboard · WorkerDashboard │
└──────────────────────┬──────────────────────────────────┘
                       │ ethers.js
         ┌─────────────▼──────────────────────┐
         │         Base Sepolia / Mainnet       │
         │                                      │
         │  PayPathRegistry                     │
         │  ├─ registerEmployer(basename)        │
         │  ├─ registerWorker(basename)          │
         │  └─ authorizeAgent(agentAddress)      │
         │                                      │
         │  PayPathPayroll (ERC721)              │
         │  ├─ createSchedule(...)              │
         │  ├─ executePayment(scheduleId) ──────┼──▶ USDC transfer
         │  └─ batchExecute([ids])              │    └─▶ mint Receipt NFT
         │                                      │         └─▶ EAS attest
         │  PayPathAttestation                  │
         │  ├─ recordPayment(worker, amount) ───┼──▶ EAS.attest()
         │  ├─ isCreditEligible(worker)         │
         │  └─ getCreditLimit(worker)           │
         │                                      │
         │  PayPathCredit                       │
         │  ├─ borrow(amount)                   │
         │  └─ repay()                          │
         └──────────────────────────────────────┘
                       ▲
         ┌─────────────┴──────────┐
         │  AgentKit Payroll Bot   │
         │  scripts/agent.ts      │
         │  Checks every 60s      │
         └────────────────────────┘
```

---

## Contract Deployment

```bash
cd paypath-contracts
npm install
cp .env.example .env   # fill PRIVATE_KEY and BASESCAN_API_KEY

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia

# Run tests
npx hardhat test

# Start AI agent
npx tsx scripts/agent.ts
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base (L2 on Ethereum) |
| Language | Solidity 0.8.24 |
| Framework | Hardhat + OpenZeppelin 5 |
| Income attestation | EAS (Ethereum Attestation Service) |
| Wallet | Coinbase Smart Wallet + MetaMask |
| Identity | Basenames (.base.eth) |
| Payments | USDC (Circle) |
| AI Agent | Coinbase AgentKit + x402 |
| Frontend | React 18 + TypeScript + ethers.js 6 |
| Fonts | Syne (display) + DM Sans (body) |

---

## Revenue Model

| Stream | Rate | Year 1 ARR Target |
|--------|------|-------------------|
| Payroll fee | 1.5% per payment | $150K at $10M monthly volume |
| Credit spread | 4% APR / 30-day term | $300K at $6M credit TVL |
| Enterprise tier | $499/month | $600K at 100 enterprise clients |

---

## Contact

Built for Base Batches 2026 Student Track.  
© 2026 PayPath Team
