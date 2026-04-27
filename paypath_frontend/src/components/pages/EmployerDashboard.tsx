'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useAgent } from '../../hooks/useAgent';
import {
  Plus, Users, DollarSign, Clock, TrendingUp, Send,
  CheckCircle, AlertCircle, ExternalLink, Zap, X,
  Play, Square, RefreshCw, Terminal, ChevronRight, Bot
} from 'lucide-react';
import './Dashboard.css';

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysUntil(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}
function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function EmployerDashboard() {
  const { schedules, addSchedule, addNotification } = useApp();
  const { address, isConnected, connect, formatAddress } = useWallet();
  const agent = useAgent();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [form, setForm] = useState({ workerBasename: '', amountUSDC: '', intervalDays: '30' });
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId]     = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<'schedules'|'agent'|'analytics'>('schedules');

  const totalMonthly  = schedules.filter(s => s.active).reduce((sum, s) => sum + (s.amountUSDC * 30 / s.intervalDays), 0);
  const activeWorkers = schedules.filter(s => s.active).length;
  const totalPaidAll  = schedules.reduce((sum, s) => sum + s.totalPaid, 0);
  const urgentCount   = schedules.filter(s => s.active && daysUntil(s.nextPayDate) <= 3).length;

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.workerBasename || !form.amountUSDC) return;
    setSubmitting(true);
    addNotification({ type: 'loading', title: 'Creating payroll schedule...', message: 'Signing tx on Base Sepolia...' });
    await new Promise(r => setTimeout(r, 2000));
    addSchedule({
      workerAddress: '0x' + Math.random().toString(16).slice(2, 18),
      workerName: form.workerBasename.includes('.base.eth') ? form.workerBasename : `${form.workerBasename}.base.eth`,
      amountUSDC: Number(form.amountUSDC),
      nextPayDate: new Date(Date.now() + Number(form.intervalDays) * 86400000),
      intervalDays: Number(form.intervalDays),
      active: true,
    });
    addNotification({ type: 'success', title: 'Schedule created!', message: `Payroll for ${form.workerBasename} is live on Base.`, txHash: '0x' + Math.random().toString(16).slice(2, 66) });
    setForm({ workerBasename: '', amountUSDC: '', intervalDays: '30' });
    setShowNewModal(false);
    setSubmitting(false);
  };

  const handleExecutePayment = async (id: string, workerName: string, amount: number) => {
    setPayingId(id);
    addNotification({ type: 'loading', title: `Sending $${amount} USDC to ${workerName}...` });
    await new Promise(r => setTimeout(r, 2500));
    addNotification({ type: 'success', title: 'Payment sent!', message: `$${amount} USDC → ${workerName}. Receipt NFT minted & income attested.`, txHash: '0x' + Math.random().toString(16).slice(2, 66) });
    setPayingId(null);
  };

  if (!isConnected) return (
    <div className="dash-connect">
      <div className="dash-connect__inner card-glow">
        <div className="dash-connect__icon"><Zap size={32} color="var(--base-blue)" /></div>
        <h2>Connect to access employer dashboard</h2>
        <p>Connect your wallet to manage payroll schedules and pay your team on Base.</p>
        <button className="btn-primary" onClick={connect} style={{ marginTop: 24, justifyContent: 'center', width: '100%' }}>
          Connect Wallet
        </button>
      </div>
    </div>
  );

  return (
    <div className="dash">
      {/* Header */}
      <div className="dash__header">
        <div className="dash__header-inner">
          <div>
            <div className="dash__welcome">Employer Dashboard</div>
            <div className="dash__address">
              {formatAddress(address!)}
              <span style={{ marginLeft: 8 }} className="badge badge-blue">acmecorp.base.eth</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={agent.running ? 'btn-secondary' : 'btn-ghost'}
              onClick={() => agent.running ? agent.stopAgent() : agent.startAgent()}
              style={{ gap: 7 }}
            >
              <Bot size={15} />
              Agent {agent.running ? 'running' : 'stopped'}
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: agent.running ? 'var(--green)' : 'var(--text-muted)', display: 'inline-block' }} />
            </button>
            <button className="btn-primary" onClick={() => setShowNewModal(true)}>
              <Plus size={16} /> New payroll
            </button>
          </div>
        </div>
      </div>

      <div className="dash__body">
        {/* Stats */}
        <div className="dash__stats">
          {[
            { icon: <Users size={18}/>, color: 'var(--base-blue)', bg: 'rgba(0,82,255,0.12)', val: activeWorkers, lbl: 'Active workers' },
            { icon: <DollarSign size={18}/>, color: 'var(--green)', bg: 'rgba(0,200,83,0.12)', val: `$${Math.round(totalMonthly).toLocaleString()}`, lbl: 'Monthly payroll' },
            { icon: <TrendingUp size={18}/>, color: 'var(--gold)', bg: 'rgba(245,166,35,0.12)', val: `$${totalPaidAll.toLocaleString()}`, lbl: 'Total paid' },
            { icon: <CheckCircle size={18}/>, color: 'var(--teal)', bg: 'rgba(0,212,170,0.12)', val: '100%', lbl: 'Success rate' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Urgent alert */}
        {urgentCount > 0 && (
          <div className="dash__alert">
            <AlertCircle size={16} />
            <span>{urgentCount} payment{urgentCount > 1 ? 's' : ''} due within 3 days. Ensure your wallet has sufficient USDC approved.</span>
            <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 13, color: 'var(--gold)' }} onClick={agent.runOnce}>
              <RefreshCw size={13} /> Check now
            </button>
          </div>
        )}

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {(['schedules','agent','analytics'] as const).map(tab => (
            <button key={tab} className="btn-ghost"
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab ? { color: 'var(--text-primary)', background: 'var(--bg-card)', fontWeight: 600 } : {}}
            >
              {tab === 'schedules' && <><Users size={14}/> Schedules</>}
              {tab === 'agent'     && <><Bot size={14}/> AI Agent</>}
              {tab === 'analytics' && <><TrendingUp size={14}/> Analytics</>}
            </button>
          ))}
        </div>

        {/* TAB: SCHEDULES */}
        {activeTab === 'schedules' && (
          <div className="dash__section">
            <div className="dash__section-header">
              <h3>Payment schedules</h3>
              <span className="tag">{schedules.filter(s => s.active).length} active</span>
              <button className="btn-ghost" style={{ marginLeft: 'auto', fontSize: 13 }} onClick={() => setShowNewModal(true)}>
                <Plus size={13}/> Add worker
              </button>
            </div>
            <div className="schedules">
              {schedules.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>
                  No schedules yet. <button className="btn-ghost" onClick={() => setShowNewModal(true)} style={{ color: 'var(--base-blue)' }}>Create your first payroll →</button>
                </div>
              )}
              {schedules.map(s => {
                const due = daysUntil(s.nextPayDate);
                const urgent = due <= 2;
                return (
                  <div key={s.id} className={`schedule-row ${urgent ? 'schedule-row--urgent' : ''}`}>
                    <div className="schedule-row__worker">
                      <div className="schedule-row__avatar" style={{ background: urgent ? 'var(--gold)' : 'var(--base-blue)' }}>{s.workerName[0].toUpperCase()}</div>
                      <div>
                        <div className="schedule-row__name">{s.workerName}</div>
                        <div className="schedule-row__meta">
                          {s.intervalDays === 7 ? 'Weekly' : s.intervalDays === 14 ? 'Bi-weekly' : 'Monthly'}
                          {' · '}Total paid: <span style={{ color: 'var(--green)' }}>${s.totalPaid.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="schedule-row__amount">
                      <div className="schedule-row__usdc">${s.amountUSDC.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>USDC</div>
                    </div>
                    <div className={`schedule-row__due ${urgent ? 'schedule-row__due--urgent' : ''}`}>
                      <Clock size={13} />
                      {due === 0 ? 'Due today!' : due === 1 ? 'Tomorrow' : `${due}d`}
                    </div>
                    <div className="schedule-row__status">
                      {s.active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Paused</span>}
                    </div>
                    <div className="schedule-row__actions">
                      <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}
                        onClick={() => handleExecutePayment(s.id, s.workerName, s.amountUSDC)}
                        disabled={payingId === s.id}
                      >
                        {payingId === s.id ? <><span className="spinner"/> Sending...</> : <><Send size={13}/> Pay now</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: AI AGENT */}
        {activeTab === 'agent' && (
          <div>
            {/* Agent control card */}
            <div className="card-glow" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: agent.running ? 'rgba(0,200,83,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${agent.running ? 'rgba(0,200,83,0.3)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: agent.running ? 'var(--green)' : 'var(--text-muted)' }}>
                  <Bot size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                    AI Payroll Agent
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Powered by Coinbase AgentKit · x402 Payment Protocol
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-ghost" onClick={agent.runOnce} style={{ fontSize: 13 }}>
                    <RefreshCw size={13}/> Run once
                  </button>
                  {agent.running
                    ? <button className="btn-secondary" onClick={agent.stopAgent} style={{ fontSize: 13, padding: '8px 16px' }}><Square size={13}/> Stop agent</button>
                    : <button className="btn-primary" onClick={agent.startAgent} style={{ fontSize: 13, padding: '8px 16px' }}><Play size={13}/> Start agent</button>
                  }
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { lbl: 'Status',          val: agent.running ? 'Running' : 'Stopped', color: agent.running ? 'var(--green)' : 'var(--text-muted)' },
                  { lbl: 'Schedules watched', val: schedules.filter(s=>s.active).length, color: 'var(--text-primary)' },
                  { lbl: 'Last check',       val: agent.lastCheck ? timeAgo(agent.lastCheck) : 'Never', color: 'var(--text-primary)' },
                  { lbl: 'Check interval',   val: '60 seconds', color: 'var(--text-primary)' },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 18, color: s.color }}>{s.val}</div>
                    <div className="stat-label" style={{ fontSize: 11 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent logs terminal */}
            <div className="dash__section">
              <div className="dash__section-header">
                <h3><Terminal size={15} style={{ marginRight: 6 }}/>Agent logs</h3>
                <span className="tag">{agent.logs.length} entries</span>
              </div>
              <div style={{ background: 'var(--bg-void)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px', fontFamily: 'monospace', fontSize: 12, maxHeight: 360, overflowY: 'auto' }}>
                {agent.logs.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
                    No logs yet — start the agent or run a manual check.
                  </div>
                )}
                {agent.logs.map(log => (
                  <div key={log.id} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 11 }}>
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span style={{
                      color: log.type === 'success' ? 'var(--green)'
                           : log.type === 'exec'    ? 'var(--teal)'
                           : log.type === 'error'   ? 'var(--red)'
                           : 'var(--text-secondary)',
                      flex: 1
                    }}>
                      [{log.type.toUpperCase()}] {log.message}
                    </span>
                    {log.txHash && (
                      <a href={`https://sepolia.basescan.org/tx/${log.txHash}`} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--text-accent)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                        tx <ExternalLink size={10}/>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div>
            <div className="dash__stats" style={{ marginBottom: 24 }}>
              {[
                { lbl: 'This month payroll', val: `$${Math.round(totalMonthly).toLocaleString()}`, sub: '+12% vs last month', color: 'var(--green)' },
                { lbl: 'Avg payment size',   val: `$${schedules.length ? Math.round(schedules.reduce((s,x)=>s+x.amountUSDC,0)/schedules.length) : 0}`, sub: 'Per contractor', color: 'var(--text-primary)' },
                { lbl: 'Protocol savings',   val: `$${Math.round(totalPaidAll * 0.065).toLocaleString()}`, sub: 'vs wire transfers (6.5%)', color: 'var(--teal)' },
                { lbl: 'Workers w/ credit',  val: `${schedules.filter(s=>s.totalPaid>=1500).length}/${activeWorkers}`, sub: 'Income passport eligible', color: 'var(--purple)' },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.val}</div>
                  <div className="stat-label">{s.lbl}</div>
                  <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Per-worker breakdown */}
            <div className="dash__section">
              <div className="dash__section-header"><h3>Worker breakdown</h3></div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px', gap: 16, padding: '10px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Worker</span><span>Total paid</span><span>Monthly</span><span>Status</span>
                </div>
                {schedules.map(s => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--base-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.workerName[0].toUpperCase()}</div>
                      <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{s.workerName}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>${s.totalPaid.toLocaleString()}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>${s.amountUSDC.toLocaleString()}</span>
                    <span className={`badge ${s.totalPaid >= 1500 ? 'badge-teal' : 'badge-gold'}`} style={{ fontSize: 10 }}>
                      {s.totalPaid >= 1500 ? 'Credit ready' : 'Building'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New schedule modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h3>New payroll schedule</h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>AI agent will execute payments automatically on Base</div>
              </div>
              <button className="btn-ghost" style={{ padding: 8 }} onClick={() => setShowNewModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreateSchedule} className="modal__form">
              <div className="form-field">
                <label className="label">Worker Basename</label>
                <input placeholder="amara.base.eth" value={form.workerBasename} onChange={e => setForm(p=>({...p,workerBasename:e.target.value}))} required />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>Worker must be registered on PayPath</div>
              </div>
              <div className="form-field">
                <label className="label">Amount (USDC)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none' }}>$</span>
                  <input type="number" placeholder="800" min="1" value={form.amountUSDC} onChange={e => setForm(p=>({...p,amountUSDC:e.target.value}))} required style={{ paddingLeft: 28 }} />
                </div>
              </div>
              <div className="form-field">
                <label className="label">Payment interval</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[{v:'7',l:'Weekly'},{v:'14',l:'Bi-weekly'},{v:'30',l:'Monthly'}].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => setForm(p=>({...p,intervalDays:opt.v}))}
                      style={{
                        padding: '10px', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
                        background: form.intervalDays === opt.v ? 'var(--base-blue)' : 'var(--bg-surface)',
                        color: form.intervalDays === opt.v ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${form.intervalDays === opt.v ? 'var(--base-blue)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >{opt.l}</button>
                  ))}
                </div>
              </div>

              {form.workerBasename && form.amountUSDC && (
                <div className="modal__preview">
                  <div className="modal__preview-label">AI agent will execute</div>
                  <div className="modal__preview-text">
                    Pay <strong>{form.workerBasename.includes('.') ? form.workerBasename : `${form.workerBasename}.base.eth`}</strong>{' '}
                    <strong>${Number(form.amountUSDC).toLocaleString()} USDC</strong> every{' '}
                    {form.intervalDays === '7' ? 'week' : form.intervalDays === '14' ? '2 weeks' : 'month'} automatically on Base.
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Fee: ${(Number(form.amountUSDC) * 0.015).toFixed(2)} USDC (1.5%)
                  </div>
                </div>
              )}

              <div className="modal__actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting || !form.workerBasename || !form.amountUSDC}>
                  {submitting ? <><span className="spinner"/> Creating...</> : <><Zap size={15}/> Create schedule</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
