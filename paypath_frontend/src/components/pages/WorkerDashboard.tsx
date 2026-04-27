'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import {
  Shield, CheckCircle, ExternalLink, CreditCard, DollarSign, Share2,
  TrendingUp, Lock, Zap, X, ArrowDownCircle, RefreshCw, FileText,
  Clock, ArrowUpRight, Info, ChevronRight
} from 'lucide-react';
import './Dashboard.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysLeft(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}

/* ── Mini bar chart for monthly income ── */
function IncomeChart({ payments, monthsActive }: { payments: any[]; monthsActive: number }) {
  const maxAmt = Math.max(...payments.map(p => p.amountUSDC), 1);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 48, marginTop: 4 }}>
      {payments.slice().reverse().slice(0, 6).reverse().map((p, i) => (
        <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: '100%', borderRadius: 3,
            background: i === payments.length - 1 ? 'var(--teal)' : 'var(--base-blue)',
            height: `${Math.round((p.amountUSDC / maxAmt) * 40) + 8}px`,
            opacity: 0.7 + (i / payments.length) * 0.3,
            transition: 'height 0.4s ease',
          }} />
        </div>
      ))}
    </div>
  );
}

/* ── Credit utilization SVG ring ── */
function CreditRing({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const r = 52, cx = 64, cy = 64, circumference = 2 * Math.PI * r;
  const strokeDash = circumference * (pct / 100);
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--gold)' : 'var(--green)'}
        strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${strokeDash} ${circumference}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800"
        fill="var(--text-primary)" fontFamily="Syne,sans-serif">
        {Math.round(pct)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10"
        fill="var(--text-muted)" fontFamily="DM Sans,sans-serif">
        USED
      </text>
    </svg>
  );
}

export default function WorkerDashboard() {
  const router = useRouter();
  const { workerProfile, updateWorkerProfile, addNotification } = useApp();
  const { address, isConnected, connect, formatAddress } = useWallet();
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState(50);
  const [borrowing, setBorrowing] = useState(false);
  const [repaying, setRepaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'passport' | 'payments' | 'credit'>('passport');

  const p = workerProfile;
  const monthlyAvg = p.monthsActive > 0 ? Math.round(p.totalUSDC / p.monthsActive) : 0;
  const eligPct = Math.min(100, (p.monthsActive / 3) * 100);
  const creditUsed = p.activeLoan?.principal ?? 0;

  const handleBorrow = async () => {
    if (borrowAmount < 10) return;
    setBorrowing(true);
    addNotification({ type: 'loading', title: `Requesting $${borrowAmount} USDC...`, message: 'Verifying income attestation on Base...' });
    await new Promise(r => setTimeout(r, 2500));
    updateWorkerProfile({
      activeLoan: {
        principal: borrowAmount,
        interestOwed: Math.round(borrowAmount * 0.04 * 30 / 365 * 100) / 100,
        dueDate: new Date(Date.now() + 30 * 86400000),
      }
    });
    addNotification({ type: 'success', title: `$${borrowAmount} USDC in your wallet!`, message: 'Repay within 30 days. 4% APR.', txHash: '0x' + Math.random().toString(16).slice(2, 66) });
    setBorrowing(false);
    setShowBorrowModal(false);
    setActiveTab('credit');
  };

  const handleRepay = async () => {
    if (!p.activeLoan) return;
    setRepaying(true);
    const total = p.activeLoan.principal + p.activeLoan.interestOwed;
    addNotification({ type: 'loading', title: `Repaying $${total.toFixed(2)} USDC...` });
    await new Promise(r => setTimeout(r, 2000));
    updateWorkerProfile({ activeLoan: null });
    addNotification({ type: 'success', title: 'Loan repaid! Credit restored.', txHash: '0x' + Math.random().toString(16).slice(2, 66) });
    setRepaying(false);
  };

  if (!isConnected) return (
    <div className="dash-connect">
      <div className="dash-connect__inner card-glow">
        <div className="dash-connect__icon" style={{ background: 'rgba(0,212,170,0.12)' }}>
          <Shield size={32} color="var(--teal)" />
        </div>
        <h2>Connect to view your income passport</h2>
        <p>Receive USDC, build verifiable income history, and access DeFi credit — all on Base.</p>
        <button className="btn-primary" onClick={connect} style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}>
          Connect Wallet
        </button>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Works with Coinbase Smart Wallet & MetaMask
        </div>
      </div>
    </div>
  );

  return (
    <div className="dash">
      {/* ── Header ── */}
      <div className="dash__header">
        <div className="dash__header-inner">
          <div>
            <div className="dash__welcome">Worker Dashboard</div>
            <div className="dash__address" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {formatAddress(address!)}
              <span className="badge badge-teal" style={{ fontSize: 11 }}>
                <Shield size={10} /> {p.basename}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => router.push('/passport')}>
              <Share2 size={14} /> Share passport
            </button>
            {p.creditEligible && !p.activeLoan && (
              <button className="btn-primary" onClick={() => setShowBorrowModal(true)} style={{ fontSize: 14 }}>
                <CreditCard size={15} /> Borrow USDC
              </button>
            )}
            {p.activeLoan && (
              <button className="btn-secondary" onClick={handleRepay} disabled={repaying} style={{ fontSize: 14 }}>
                {repaying ? <><span className="spinner" /> Repaying...</> : <><RefreshCw size={14} /> Repay loan</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="dash__body">

        {/* ── Income Passport Hero ── */}
        <div className="passport-hero">
          <div className="passport-hero__orb" />
          <div className="passport-hero__layout">

            {/* Left: identity + stats */}
            <div className="passport-hero__info">
              <div className="passport-hero__eyebrow">
                <Shield size={13} /> Income Passport · Attested on Base
              </div>
              <div className="passport-hero__name">{p.basename}</div>
              <div className="passport-hero__addr">
                {address ? formatAddress(address) : p.address}
                <a href="https://sepolia.easscan.org" target="_blank" rel="noreferrer"
                  style={{ marginLeft: 10, color: 'var(--text-accent)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  View on EAS <ExternalLink size={10} />
                </a>
              </div>

              <div className="passport-hero__stats">
                <div>
                  <div className="passport-hero__stat-val">${p.totalUSDC.toLocaleString()}</div>
                  <div className="passport-hero__stat-lbl">Total earned</div>
                </div>
                <div>
                  <div className="passport-hero__stat-val">{p.monthsActive}</div>
                  <div className="passport-hero__stat-lbl">Months active</div>
                </div>
                <div>
                  <div className="passport-hero__stat-val">${monthlyAvg.toLocaleString()}</div>
                  <div className="passport-hero__stat-lbl">Avg / month</div>
                </div>
                <div>
                  <div className="passport-hero__stat-val"
                    style={{ color: p.creditEligible ? 'var(--green)' : 'var(--gold)' }}>
                    {p.creditEligible ? '✓ Ready' : `${p.monthsActive}/3`}
                  </div>
                  <div className="passport-hero__stat-lbl">Credit status</div>
                </div>
              </div>

              {/* Income mini chart */}
              {p.payments.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Income trend
                  </div>
                  <IncomeChart payments={p.payments} monthsActive={p.monthsActive} />
                </div>
              )}
            </div>

            {/* Right: months calendar */}
            <div className="passport-months-grid">
              <div className="passport-months-label">12-month payment calendar</div>
              <div className="passport-months-row">
                {MONTHS.map((m, i) => {
                  const paid = i < p.monthsActive;
                  return (
                    <div key={m} className={`passport-month-tile ${paid ? 'passport-month-tile--paid' : ''}`}>
                      <div className="passport-month-tile__dot">
                        {paid ? <CheckCircle size={14} /> : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{i + 1}</span>}
                      </div>
                      <div className="passport-month-tile__lbl">{m}</div>
                    </div>
                  );
                })}
              </div>

              {/* Active loan warning */}
              {p.activeLoan && (
                <div style={{ marginTop: 16, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={13} />
                  Loan of ${p.activeLoan.principal} due in {daysLeft(p.activeLoan.dueDate)} days
                  <button className="btn-ghost" style={{ padding: '3px 10px', fontSize: 11, color: 'var(--gold)', marginLeft: 'auto' }} onClick={handleRepay}>
                    Repay
                  </button>
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <Lock size={11} />
                Non-revocable EAS attestations · Worker-owned forever
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>
          {([
            { id: 'passport', icon: <FileText size={14} />, label: 'Passport' },
            { id: 'payments', icon: <DollarSign size={14} />, label: `Payments (${p.payments.length})` },
            { id: 'credit',   icon: <CreditCard size={14} />, label: 'Credit line' },
          ] as const).map(tab => (
            <button key={tab.id} className="btn-ghost"
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? {
                color: 'var(--text-primary)', background: 'var(--bg-card)',
                fontWeight: 600, borderBottom: '2px solid var(--base-blue)',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              } : {}}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: PASSPORT ══ */}
        {activeTab === 'passport' && (
          <div>
            <div className="dash__stats">
              {[
                { icon: <TrendingUp size={18} />, color: 'var(--teal)',      bg: 'rgba(0,212,170,0.12)', val: `$${monthlyAvg.toLocaleString()}`, lbl: 'Avg monthly income' },
                { icon: <Shield size={18} />,     color: 'var(--base-blue)', bg: 'rgba(0,82,255,0.12)',  val: p.monthsActive,                    lbl: 'Months verified' },
                { icon: <CheckCircle size={18} />, color: 'var(--green)',    bg: 'rgba(0,200,83,0.12)',  val: '100%',                            lbl: 'On-time rate' },
                { icon: <Lock size={18} />,        color: 'var(--purple)',   bg: 'rgba(124,58,237,0.12)', val: p.paymentCount,                   lbl: 'EAS attestations' },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  <div className="stat-value">{s.val}</div>
                  <div className="stat-label">{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Eligibility progress */}
            {!p.creditEligible ? (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Credit eligibility progress
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Receive USDC payments for 3 months to unlock your DeFi credit line
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--gold)', flexShrink: 0 }}>
                    {p.monthsActive}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/3</span>
                  </div>
                </div>
                <div style={{ height: 8, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${eligPct}%`,
                    background: 'linear-gradient(90deg, var(--base-blue), var(--teal))',
                    borderRadius: 4, transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  {3 - p.monthsActive} more month{3 - p.monthsActive !== 1 ? 's' : ''} until credit line unlocks
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(0,200,83,0.06)', border: '1px solid rgba(0,200,83,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <CheckCircle size={22} color="var(--green)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: 15 }}>Credit line active — up to ${p.creditLimit} USDC</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    4% APR · 30-day term · No credit check · Collateral: your income attestation
                  </div>
                </div>
                {!p.activeLoan && (
                  <button className="btn-primary" style={{ padding: '9px 18px', fontSize: 13, flexShrink: 0 }} onClick={() => setShowBorrowModal(true)}>
                    <ArrowDownCircle size={14} /> Borrow now
                  </button>
                )}
              </div>
            )}

            {/* How passport works */}
            <div className="card">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>
                How your income passport works
              </div>
              {[
                { icon: <DollarSign size={15} color="var(--base-blue)" />, title: 'Payment received', desc: 'Your employer sends USDC on Base. Lands in your wallet in seconds.' },
                { icon: <FileText size={15} color="var(--teal)" />,        title: 'Receipt NFT minted', desc: 'A permanent receipt NFT is minted to your wallet as tamper-proof record.' },
                { icon: <Shield size={15} color="var(--purple)" />,        title: 'EAS attestation issued', desc: 'Your income credential is attested on Base via EAS — non-revocable, forever.' },
                { icon: <CreditCard size={15} color="var(--green)" />,     title: 'Credit line unlocks', desc: 'After 3 months, borrow up to 30% of your 3-month average income.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                  {i < 3 && <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto', flexShrink: 0, alignSelf: 'center' }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB: PAYMENTS ══ */}
        {activeTab === 'payments' && (
          <div>
            {/* Summary row */}
            <div className="dash__stats" style={{ marginBottom: 20 }}>
              {[
                { val: `$${p.totalUSDC.toLocaleString()}`, lbl: 'Total received', color: 'var(--green)' },
                { val: p.paymentCount.toString(),          lbl: 'Payments',        color: 'var(--text-primary)' },
                { val: `$${monthlyAvg.toLocaleString()}`,  lbl: 'Monthly avg',    color: 'var(--teal)' },
                { val: '0',                                lbl: 'Failed',          color: 'var(--text-muted)' },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.val}</div>
                  <div className="stat-label">{s.lbl}</div>
                </div>
              ))}
            </div>

            <div className="dash__section">
              <div className="dash__section-header">
                <h3>Payment history</h3>
                <span className="badge badge-teal" style={{ fontSize: 11 }}>
                  <Lock size={9} /> All attested on Base
                </span>
              </div>

              {/* Payment list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.payments.map((pay, i) => (
                  <div key={pay.id} className="payment-row"
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16 }}>
                    <div className="payment-row__employer">
                      <div className="payment-row__emp-avatar"
                        style={{ background: `hsl(${i * 47 % 360}, 60%, 40%)` }}>
                        {pay.employerName[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="payment-row__emp-name">{pay.employerName}</div>
                        <div className="payment-row__date">{formatDate(pay.paidAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="payment-row__amount">+${pay.amountUSDC}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="badge badge-teal" style={{ fontSize: 10, padding: '2px 8px' }}>
                        <CheckCircle size={9} /> Attested
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a href={`https://sepolia.basescan.org/tx/${pay.txHash}`}
                        target="_blank" rel="noreferrer"
                        className="payment-row__link" title="View on BaseScan">
                        <ArrowUpRight size={15} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {p.payments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                  <DollarSign size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No payments yet</div>
                  <div style={{ fontSize: 13 }}>Share your Basename with employers to start receiving USDC payments</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: CREDIT ══ */}
        {activeTab === 'credit' && (
          <div>
            {!p.creditEligible ? (
              /* Locked state */
              <div className="credit-card">
                <div className="credit-card__glow" />
                <div style={{ textAlign: 'center', padding: '40px 20px', position: 'relative' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-surface)', border: '2px solid var(--border-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Lock size={24} color="var(--text-muted)" />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Credit line locked
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 24px' }}>
                    Receive USDC payments for {3 - p.monthsActive} more month{3 - p.monthsActive !== 1 ? 's' : ''} to unlock your DeFi credit line.
                    No credit check. No bank. Just your verified income.
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', fontSize: 14, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid', borderColor: i < p.monthsActive ? 'var(--teal)' : 'var(--border-mid)', background: i < p.monthsActive ? 'rgba(0,212,170,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {i < p.monthsActive && <CheckCircle size={13} color="var(--teal)" />}
                        </div>
                      ))}
                    </div>
                    <span>{p.monthsActive}/3 months verified</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Active state */
              <>
                {/* Main credit card */}
                <div className="credit-card" style={{ marginBottom: 20 }}>
                  <div className="credit-card__glow" />
                  <div style={{ position: 'relative' }}>
                    <div className="credit-card__header">
                      <div>
                        <div className="credit-card__title">DeFi Credit Line</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                          Backed by your income attestation on Base
                        </div>
                      </div>
                      <span className={`badge ${p.activeLoan ? 'badge-gold' : 'badge-green'}`}>
                        {p.activeLoan ? 'Loan active' : 'Available'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
                      <div>
                        {/* Credit metrics */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                          {[
                            { lbl: 'Credit limit',   val: `$${p.creditLimit}`,                       color: 'var(--green)' },
                            { lbl: 'Available now',  val: `$${p.activeLoan ? p.creditLimit - p.activeLoan.principal : p.creditLimit}`, color: p.activeLoan ? 'var(--gold)' : 'var(--green)' },
                            { lbl: 'Annual rate',    val: '4% APR',                                   color: 'var(--text-primary)' },
                            { lbl: 'Term',           val: '30 days',                                  color: 'var(--text-primary)' },
                          ].map((m, i) => (
                            <div key={i} className="stat-card" style={{ padding: '14px 16px' }}>
                              <div className="stat-value" style={{ fontSize: 19, color: m.color }}>{m.val}</div>
                              <div className="stat-label" style={{ fontSize: 11 }}>{m.lbl}</div>
                            </div>
                          ))}
                        </div>

                        {/* Active loan details */}
                        {p.activeLoan ? (
                          <div style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14, marginBottom: 12 }}>Active loan</div>
                            {[
                              ['Principal',   `$${p.activeLoan.principal}`],
                              ['Interest (30d)', `$${p.activeLoan.interestOwed.toFixed(2)}`],
                              ['Total due',   `$${(p.activeLoan.principal + p.activeLoan.interestOwed).toFixed(2)}`],
                              ['Due date',    formatDate(p.activeLoan.dueDate)],
                              ['Days left',   `${daysLeft(p.activeLoan.dueDate)} days`],
                            ].map(([lbl, val], i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                <span>{lbl}</span>
                                <span style={{ fontWeight: 600, color: i === 2 ? 'var(--text-primary)' : i === 4 ? (daysLeft(p.activeLoan!.dueDate) <= 3 ? 'var(--red)' : 'var(--text-primary)') : 'var(--text-primary)' }}>{val}</span>
                              </div>
                            ))}
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={handleRepay} disabled={repaying}>
                              {repaying ? <><span className="spinner" /> Repaying...</> : <><RefreshCw size={14} /> Repay ${(p.activeLoan.principal + p.activeLoan.interestOwed).toFixed(2)} USDC</>}
                            </button>
                          </div>
                        ) : (
                          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={() => setShowBorrowModal(true)}>
                            <ArrowDownCircle size={16} /> Borrow USDC
                          </button>
                        )}
                      </div>

                      {/* Ring */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <CreditRing used={creditUsed} total={p.creditLimit} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 120 }}>
                          Credit utilization
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* How credit works explainer */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>
                    <Info size={15} color="var(--base-blue)" /> How PayPath credit works
                  </div>
                  {[
                    { icon: <Shield size={14} color="var(--teal)" />,       t: 'Income-based, not credit-score-based', d: 'Your EAS attestation proves your income. No FICO score needed.' },
                    { icon: <DollarSign size={14} color="var(--green)" />,  t: 'Limit = 30% of 3-month average', d: `Your avg is $${monthlyAvg}/mo. 30% of 3 months = $${p.creditLimit} limit.` },
                    { icon: <Clock size={14} color="var(--gold)" />,        t: '30-day term, 4% annual rate', d: 'Repay within 30 days. Interest on $100 = $0.33 for the full term.' },
                    { icon: <Lock size={14} color="var(--purple)" />,       t: 'No assets locked as collateral', d: 'Your income attestation is the collateral. Nothing custodied.' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{r.t}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Borrow modal ── */}
      {showBorrowModal && (
        <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h3>Borrow USDC</h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                  Backed by your {p.basename} income passport
                </div>
              </div>
              <button className="btn-ghost" style={{ padding: 8 }} onClick={() => setShowBorrowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal__form">
              {/* Amount display */}
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>
                  ${borrowAmount}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>USDC</div>
              </div>

              {/* Slider */}
              <div className="form-field" style={{ gap: 8 }}>
                <input type="range" min={10} max={p.creditLimit} step={5}
                  value={borrowAmount} onChange={e => setBorrowAmount(Number(e.target.value))}
                  style={{ width: '100%', height: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>$10 min</span>
                  <span>${p.creditLimit} max</span>
                </div>
              </div>

              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[25, 50, 100, p.creditLimit].filter(v => v <= p.creditLimit).map(v => (
                  <button key={v} type="button"
                    onClick={() => setBorrowAmount(v)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-md)',
                      fontSize: 13, fontWeight: 500,
                      background: borrowAmount === v ? 'var(--base-blue)' : 'var(--bg-surface)',
                      color: borrowAmount === v ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${borrowAmount === v ? 'var(--base-blue)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    ${v === p.creditLimit ? 'Max' : v}
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="modal__preview">
                <div className="modal__preview-label">Loan summary</div>
                {[
                  ['You receive',        `$${borrowAmount} USDC → your wallet instantly`],
                  ['Interest (30 days)', `$${(borrowAmount * 0.04 * 30 / 365).toFixed(2)} USDC`],
                  ['Total to repay',     `$${(borrowAmount + borrowAmount * 0.04 * 30 / 365).toFixed(2)} USDC`],
                  ['Due date',           new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
                  ['Collateral',         `${p.basename} EAS income attestation`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', color: 'var(--text-secondary)' }}>
                    <span>{l}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 220, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="modal__actions">
                <button className="btn-secondary" onClick={() => setShowBorrowModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleBorrow} disabled={borrowing}>
                  {borrowing ? <><span className="spinner" /> Borrowing...</> : <><Zap size={15} /> Borrow ${borrowAmount} USDC</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
