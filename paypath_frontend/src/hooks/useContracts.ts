'use client';

import { useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { useApp } from '../context/AppContext';
import {
  CONTRACTS,
  REGISTRY_ABI, PAYROLL_ABI, ATTESTATION_ABI, CREDIT_ABI, ERC20_ABI,
} from '../contracts/abis';

export function useContracts() {
  const { signer, provider } = useWallet();
  const { addNotification } = useApp();

  const getContracts = useCallback(() => {
    if (!signer) throw new Error('Wallet not connected');
    return {
      registry:    new ethers.Contract(CONTRACTS.REGISTRY,    REGISTRY_ABI,    signer),
      payroll:     new ethers.Contract(CONTRACTS.PAYROLL,     PAYROLL_ABI,     signer),
      attestation: new ethers.Contract(CONTRACTS.ATTESTATION, ATTESTATION_ABI, signer),
      credit:      new ethers.Contract(CONTRACTS.CREDIT,      CREDIT_ABI,      signer),
      usdc:        new ethers.Contract(CONTRACTS.USDC_SEPOLIA, ERC20_ABI,      signer),
    };
  }, [signer]);

  // ── Registration ──────────────────────────────────────────────────────────

  const registerEmployer = useCallback(async (basename: string) => {
    const { registry } = getContracts();
    const tx = await registry.registerEmployer(basename);
    addNotification({ type: 'loading', title: 'Registering employer...' });
    const receipt = await tx.wait();
    addNotification({ type: 'success', title: 'Employer registered!', txHash: receipt.hash });
    return receipt;
  }, [getContracts, addNotification]);

  const registerWorker = useCallback(async (basename: string) => {
    const { registry } = getContracts();
    const tx = await registry.registerWorker(basename);
    addNotification({ type: 'loading', title: 'Registering worker...' });
    const receipt = await tx.wait();
    addNotification({ type: 'success', title: 'Worker registered!', txHash: receipt.hash });
    return receipt;
  }, [getContracts, addNotification]);

  // ── Payroll ───────────────────────────────────────────────────────────────

  const approveUSDC = useCallback(async (amount: bigint) => {
    const { usdc } = getContracts();
    const tx = await usdc.approve(CONTRACTS.PAYROLL, amount);
    addNotification({ type: 'loading', title: 'Approving USDC...' });
    const receipt = await tx.wait();
    addNotification({ type: 'success', title: 'USDC approved!', txHash: receipt.hash });
    return receipt;
  }, [getContracts, addNotification]);

  const createSchedule = useCallback(async (
    employer: string,
    worker: string,
    amountUSDC: bigint,
    firstPayDate: number,
    intervalDays: number
  ) => {
    const { payroll, usdc } = getContracts();
    // Check allowance first
    const senderAddr = await signer!.getAddress();
    const allowance: bigint = await usdc.allowance(senderAddr, CONTRACTS.PAYROLL);
    if (allowance < amountUSDC * 12n) {
      await approveUSDC(amountUSDC * 120n); // approve 120x for ~10 years
    }
    const tx = await payroll.createSchedule(employer, worker, amountUSDC, firstPayDate, intervalDays);
    addNotification({ type: 'loading', title: 'Creating payroll schedule...' });
    const receipt = await tx.wait();
    addNotification({ type: 'success', title: 'Schedule created!', message: 'AI agent will now execute payments automatically.', txHash: receipt.hash });
    return receipt;
  }, [getContracts, signer, approveUSDC, addNotification]);

  const executePayment = useCallback(async (scheduleId: bigint) => {
    const { payroll } = getContracts();
    const tx = await payroll.executePayment(scheduleId);
    addNotification({ type: 'loading', title: 'Sending payment...' });
    const receipt = await tx.wait();
    addNotification({ type: 'success', title: 'Payment sent!', message: 'Receipt NFT minted. Income attested on Base.', txHash: receipt.hash });
    return receipt;
  }, [getContracts, addNotification]);

  // ── Credit ────────────────────────────────────────────────────────────────

  const borrowUSDC = useCallback(async (amountUSDC: bigint) => {
    const { credit } = getContracts();
    const tx = await credit.borrow(amountUSDC);
    addNotification({ type: 'loading', title: 'Requesting USDC loan...' });
    const receipt = await tx.wait();
    addNotification({ type: 'success', title: 'Loan issued!', message: 'USDC sent to your wallet. Repay within 30 days.', txHash: receipt.hash });
    return receipt;
  }, [getContracts, addNotification]);

  const repayLoan = useCallback(async (totalAmount: bigint) => {
    const { credit, usdc } = getContracts();
    const senderAddr = await signer!.getAddress();
    const allowance: bigint = await usdc.allowance(senderAddr, CONTRACTS.CREDIT);
    if (allowance < totalAmount) {
      await approveUSDC(totalAmount);
    }
    const tx = await credit.repay();
    addNotification({ type: 'loading', title: 'Repaying loan...' });
    const receipt = await tx.wait();
    addNotification({ type: 'success', title: 'Loan repaid!', message: 'Your credit line is restored.', txHash: receipt.hash });
    return receipt;
  }, [getContracts, signer, approveUSDC, addNotification]);

  // ── Read functions ────────────────────────────────────────────────────────

  const getWorkerProfile = useCallback(async (address: string) => {
    if (!provider) return null;
    const attestation = new ethers.Contract(CONTRACTS.ATTESTATION, ATTESTATION_ABI, provider);
    const credit      = new ethers.Contract(CONTRACTS.CREDIT,      CREDIT_ABI,      provider);
    const [profile, eligible, limit, hasLoan] = await Promise.all([
      attestation.getProfile(address),
      attestation.isCreditEligible(address),
      attestation.getCreditLimit(address),
      credit.hasActiveLoan(address),
    ]);
    let loan = null;
    if (hasLoan) loan = await credit.getLoan(address);
    return { profile, eligible, limit, hasLoan, loan };
  }, [provider]);

  const getEmployerSchedules = useCallback(async (address: string) => {
    if (!provider) return [];
    const payroll = new ethers.Contract(CONTRACTS.PAYROLL, PAYROLL_ABI, provider);
    const ids: bigint[] = await payroll.getEmployerSchedules(address);
    return Promise.all(ids.map(id => payroll.schedules(id).then((s: any) => ({ ...s, id }))));
  }, [provider]);

  return {
    registerEmployer, registerWorker,
    approveUSDC, createSchedule, executePayment,
    borrowUSDC, repayLoan,
    getWorkerProfile, getEmployerSchedules,
  };
}
