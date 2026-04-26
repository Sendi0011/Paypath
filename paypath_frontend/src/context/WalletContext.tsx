'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

interface WalletContextType {
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBase: () => Promise<void>;
  formatAddress: (addr: string) => string;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

const BASE_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

const BASE_NETWORK = {
  chainId: '0x' + BASE_CHAIN_ID.toString(16),
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

const BASE_SEPOLIA_NETWORK = {
  chainId: '0x' + BASE_SEPOLIA_CHAIN_ID.toString(16),
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org'],
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const setupProvider = useCallback(async (eth: any) => {
    const p = new ethers.BrowserProvider(eth);
    const net = await p.getNetwork();
    const s = await p.getSigner();
    const addr = await s.getAddress();
    setProvider(p);
    setSigner(s);
    setAddress(addr);
    setChainId(Number(net.chainId));
    return { p, s, addr, chainId: Number(net.chainId) };
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      setError('No wallet detected. Please install Coinbase Wallet or MetaMask.');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      await eth.request({ method: 'eth_requestAccounts' });
      await setupProvider(eth);
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, [setupProvider]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  }, []);

  const switchToBase = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_NETWORK.chainId }],
      });
    } catch (e: any) {
      if (e.code === 4902) {
        await eth.request({ method: 'wallet_addEthereumChain', params: [BASE_SEPOLIA_NETWORK] });
      }
    }
  }, []);

  // Auto-reconnect
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts.length > 0) setupProvider(eth);
    });
    const handleAccounts = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else setupProvider(eth);
    };
    const handleChain = (chainId: string) => setChainId(parseInt(chainId, 16));
    eth.on('accountsChanged', handleAccounts);
    eth.on('chainChanged', handleChain);
    return () => {
      eth.removeListener('accountsChanged', handleAccounts);
      eth.removeListener('chainChanged', handleChain);
    };
  }, [setupProvider, disconnect]);

  return (
    <WalletContext.Provider value={{
      address, provider, signer, chainId,
      isConnecting, isConnected: !!address,
      connect, disconnect, switchToBase,
      formatAddress, error,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be inside WalletProvider');
  return ctx;
}
