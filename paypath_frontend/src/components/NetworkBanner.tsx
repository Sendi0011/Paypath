'use client';

import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const SUPPORTED_CHAINS = [8453, 84532]; // Base mainnet + Sepolia

export default function NetworkBanner() {
  const { chainId, isConnected, switchToBase } = useWallet();

  if (!isConnected) return null;
  if (!chainId || SUPPORTED_CHAINS.includes(chainId)) return null;

  return (
    <div style={{
      position: 'fixed', top: 64, left: 0, right: 0, zIndex: 90,
      background: 'rgba(245,166,35,0.12)',
      borderBottom: '1px solid rgba(245,166,35,0.3)',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, fontSize: 13,
    }}>
      <AlertTriangle size={15} color="var(--gold)" />
      <span style={{ color: 'var(--gold)' }}>
        You're on the wrong network. PayPath runs on Base.
      </span>
      <button
        onClick={switchToBase}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 14px', background: 'var(--gold)',
          color: 'var(--bg-void)', borderRadius: 'var(--radius-full)',
          fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)',
          border: 'none', cursor: 'pointer',
        }}
      >
        Switch to Base <ArrowRight size={11} />
      </button>
    </div>
  );
}
