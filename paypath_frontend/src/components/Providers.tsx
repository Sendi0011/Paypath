'use client';

import { WalletProvider } from '../context/WalletContext';
import { AppProvider } from '../context/AppContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </WalletProvider>
  );
}
