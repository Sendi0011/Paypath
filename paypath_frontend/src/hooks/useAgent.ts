'use client';

import { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';

interface AgentLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'exec' | 'success' | 'error';
  message: string;
  txHash?: string;
  scheduleId?: string;
}

export function useAgent() {
  const [running, setRunning]   = useState(false);
  const [logs, setLogs]         = useState<AgentLog[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const { schedules, addNotification } = useApp();
  const { address } = useWallet();

  const addLog = useCallback((type: AgentLog['type'], message: string, extra?: Partial<AgentLog>) => {
    setLogs(prev => [{
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
      ...extra,
    }, ...prev].slice(0, 50)); // keep last 50 logs
  }, []);

  const checkAndExecute = useCallback(async () => {
    setLastCheck(new Date());
    const now = Date.now();
    const due = schedules.filter(s => s.active && s.nextPayDate.getTime() <= now);

    if (due.length === 0) {
      addLog('info', 'Checked all schedules — no payments due');
      return;
    }

    addLog('info', `Found ${due.length} payment(s) due`);

    for (const schedule of due) {
      addLog('exec', `Executing payment: $${schedule.amountUSDC} USDC → ${schedule.workerName}`, {
        scheduleId: schedule.id,
      });

      // In production: call payroll contract via AgentKit
      // Here we simulate with a delay
      await new Promise(r => setTimeout(r, 1500));

      const mockTxHash = '0x' + Math.random().toString(16).slice(2, 66);
      addLog('success', `Payment sent: $${schedule.amountUSDC} USDC → ${schedule.workerName}`, {
        txHash: mockTxHash,
        scheduleId: schedule.id,
      });

      addNotification({
        type: 'success',
        title: '🤖 Agent executed payment',
        message: `$${schedule.amountUSDC} USDC → ${schedule.workerName}`,
        txHash: mockTxHash,
      });
    }
  }, [schedules, addLog, addNotification]);

  const startAgent = useCallback(() => {
    if (running) return;
    setRunning(true);
    addLog('info', `Agent started — monitoring ${schedules.length} schedule(s) every 60s`);
    checkAndExecute();
    intervalRef.current = setInterval(checkAndExecute, 60_000);
  }, [running, schedules, addLog, checkAndExecute]);

  const stopAgent = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current as unknown as number);
    setRunning(false);
    addLog('info', 'Agent stopped');
  }, [addLog]);

  const runOnce = useCallback(async () => {
    addLog('info', 'Manual check triggered');
    await checkAndExecute();
  }, [addLog, checkAndExecute]);

  return { running, logs, lastCheck, startAgent, stopAgent, runOnce };
}
