'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'employer' | 'worker' | null;

export interface PaymentSchedule {
  id: string;
  workerAddress: string;
  workerName: string;
  amountUSDC: number;
  nextPayDate: Date;
  intervalDays: number;
  active: boolean;
  totalPaid: number;
}

export interface WorkerProfile {
  address: string;
  basename: string;
  totalUSDC: number;
  monthsActive: number;
  paymentCount: number;
  creditEligible: boolean;
  creditLimit: number;
  activeLoan: {
    principal: number;
    interestOwed: number;
    dueDate: Date;
  } | null;
  payments: PaymentHistoryItem[];
}

export interface PaymentHistoryItem {
  id: string;
  employer: string;
  employerName: string;
  amountUSDC: number;
  paidAt: Date;
  txHash: string;
  attestationUID: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  title: string;
  message?: string;
  txHash?: string;
}

// Demo data for presentation
const DEMO_SCHEDULES: PaymentSchedule[] = [
  { id: '1', workerAddress: '0x742d35Cc6634C0532925a3b8D4C9C5A1', workerName: 'amara.base.eth',      amountUSDC: 800,  nextPayDate: new Date(Date.now() + 5  * 24 * 3600000), intervalDays: 30, active: true, totalPaid: 3200 },
  { id: '2', workerAddress: '0x8Ba1f109551bD432803012645Ac136cc', workerName: 'kemi.base.eth',       amountUSDC: 1200, nextPayDate: new Date(Date.now() + 12 * 24 * 3600000), intervalDays: 14, active: true, totalPaid: 6000 },
  { id: '3', workerAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12', workerName: 'oluwaseun.base.eth', amountUSDC: 500,  nextPayDate: new Date(Date.now() + 2  * 24 * 3600000), intervalDays: 7,  active: true, totalPaid: 2000 },
  { id: '4', workerAddress: '0x90F79bf6EB2c4f870365E785982E1f10', workerName: 'fatima.base.eth',    amountUSDC: 2400, nextPayDate: new Date(Date.now() + 8  * 24 * 3600000), intervalDays: 30, active: true, totalPaid: 9600 },
  { id: '5', workerAddress: '0x15d34AAf54267DB7D7c367839AAf71A0', workerName: 'chidi.base.eth',     amountUSDC: 650,  nextPayDate: new Date(Date.now() + 1  * 24 * 3600000), intervalDays: 14, active: true, totalPaid: 1300 },
];

const DEMO_WORKER: WorkerProfile = {
  address: '0x742d35Cc6634C0532925a3b8D4C9C5A1',
  basename: 'amara.base.eth',
  totalUSDC: 4800,
  monthsActive: 6,
  paymentCount: 6,
  creditEligible: true,
  creditLimit: 480,
  activeLoan: null,
  payments: [
    { id: '1', employer: '0x90F79bf6EB2c4f870365E785982E1f10', employerName: 'acmecorp.base.eth',    amountUSDC: 800, paidAt: new Date(Date.now() -  30 * 24 * 3600000), txHash: '0xa1b2c3d4e5f678901234567890abcdef1234567890abcdef12345678', attestationUID: '0xf1e2d3c4b5a6978801234567890abcdef1234567890abcdef12345601' },
    { id: '2', employer: '0x90F79bf6EB2c4f870365E785982E1f10', employerName: 'acmecorp.base.eth',    amountUSDC: 800, paidAt: new Date(Date.now() -  60 * 24 * 3600000), txHash: '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12', attestationUID: '0xe2d3c4b5a697880123456789abcdef1234567890abcdef1234567802' },
    { id: '3', employer: '0x90F79bf6EB2c4f870365E785982E1f10', employerName: 'acmecorp.base.eth',    amountUSDC: 800, paidAt: new Date(Date.now() -  90 * 24 * 3600000), txHash: '0xc3d4e5f67890123456789012345678901234567890abcdef1234567890', attestationUID: '0xd3c4b5a69788012345678901234567890abcdef1234567890abcdef03' },
    { id: '4', employer: '0x90F79bf6EB2c4f870365E785982E1f10', employerName: 'acmecorp.base.eth',    amountUSDC: 800, paidAt: new Date(Date.now() - 120 * 24 * 3600000), txHash: '0xd4e5f678901234567890123456789012345678901234567890abcdef12', attestationUID: '0xc4b5a6978801234567890123456789abcdef1234567890abcdef1204' },
    { id: '5', employer: '0x15d34AAf54267DB7D7c367839AAf71A0', employerName: 'buildstudio.base.eth', amountUSDC: 800, paidAt: new Date(Date.now() - 150 * 24 * 3600000), txHash: '0xe5f6789012345678901234567890123456789012345678901234567890', attestationUID: '0xb5a697880123456789012345678901234567890abcdef1234567890ab05' },
    { id: '6', employer: '0x15d34AAf54267DB7D7c367839AAf71A0', employerName: 'buildstudio.base.eth', amountUSDC: 800, paidAt: new Date(Date.now() - 180 * 24 * 3600000), txHash: '0xf678901234567890123456789012345678901234567890abcdef123456', attestationUID: '0xa697880123456789012345678901234567890abcdef1234567890abc006' },
  ],
};

interface AppContextType {
  role: UserRole;
  setRole: (r: UserRole) => void;
  schedules: PaymentSchedule[];
  addSchedule: (s: Omit<PaymentSchedule, 'id' | 'totalPaid'>) => void;
  workerProfile: WorkerProfile;
  updateWorkerProfile: (updates: Partial<WorkerProfile>) => void;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  demoMode: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>(DEMO_SCHEDULES);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile>(DEMO_WORKER);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addSchedule = (s: Omit<PaymentSchedule, 'id' | 'totalPaid'>) => {
    const id = Date.now().toString();
    setSchedules(prev => [...prev, { ...s, id, totalPaid: 0 }]);
  };

  const updateWorkerProfile = (updates: Partial<WorkerProfile>) => {
    setWorkerProfile(prev => ({ ...prev, ...updates }));
  };

  const addNotification = (n: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...n, id }]);
    if (n.type !== 'loading') {
      setTimeout(() => removeNotification(id), 6000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      role, setRole, schedules, addSchedule,
      workerProfile, updateWorkerProfile,
      notifications, addNotification, removeNotification,
      demoMode: true,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
