'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import {
  Shield, CheckCircle, ExternalLink, Copy, Share2,
  Lock, ArrowLeft, Zap, TrendingUp, Calendar
} from 'lucide-react';
import './PassportPage.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PassportPage({ address }: { address?: string }) {
  const router = useRouter();
  const { workerProfile } = useApp();
  const [copied, setCopied] = useState(false);

  // In production: fetch from chain via address param
  const profile = workerProfile;

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const monthlyAvg = profile.monthsActive > 0
    ? Math.round(profile.totalUSDC / profile.monthsActive) : 0;

  return (
    <div className="passport-page">
      {/* Background */}
      <div className="passport-page__bg">
        <div className="passport-page__orb passport-page__orb--1" />
        <div className="passport-page__orb passport-page__orb--2" />
      </div>

      <div className="passport-page__inner">
        {/* Back nav */}
        <button className="btn-ghost" style={{ marginBottom: 24 }} onClick={() => router.back()}>
          <ArrowLeft size={15} /> Back
        </button>

        {/* Main passport card */}
        <div className="passport-card-full">
          {/* Top strip */}
          <div className="passport-card-full__strip" />

          {/* Header */}
          <div className="passport-card-full__header">
            <div className="passport-card-full__avatar">
              {profile.basename[0].toUpperCase()}
            </div>
            <div className="passport-card-full__identity">
              <div className="passport-card-full__name">{profile.basename}</div>
              <div className="passport-card-full__addr">
                {address || profile.address}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-teal">
                  <Shield size={11} /> Income Verified
                </span>
                {profile.creditEligible && (
                  <span className="badge badge-green">
                    <CheckCircle size={11} /> Credit Eligible
                  </span>
                )}
                <span className="badge badge-blue">Base Network</span>
              </div>
            </div>
            <div className="passport-card-full__actions">
              <button className="btn-secondary" onClick={handleCopy} style={{ fontSize: 13, padding: '8px 16px' }}>
                {copied ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
              </button>
              <a
                href={`https://sepolia.easscan.org`}
                target="_blank" rel="noreferrer"
                className="btn-ghost"
                style={{ fontSize: 13 }}
              >
                <ExternalLink size={13} /> EAS Explorer
              </a>
            </div>
          </div>

          <div className="passport-card-full__divider" />

          {/* Stats grid */}
          <div className="passport-card-full__stats">
            {[
              { icon: <TrendingUp size={18}/>, color: 'var(--green)',   label: 'Total earned',    value: `$${profile.totalUSDC.toLocaleString()}`, sub: 'USDC on Base' },
              { icon: <Calendar size={18}/>,   color: 'var(--teal)',    label: 'Months active',   value: profile.monthsActive.toString(),           sub: 'Consecutive payments' },
              { icon: <Zap size={18}/>,        color: 'var(--base-blue)', label: 'Avg / month',  value: `$${monthlyAvg.toLocaleString()}`,           sub: 'USDC average' },
              { icon: <Shield size={18}/>,     color: 'var(--purple)',  label: 'Attestations',    value: profile.paymentCount.toString(),            sub: 'On-chain records' },
            ].map((s, i) => (
              <div key={i} className="passport-stat">
                <div className="passport-stat__icon" style={{ color: s.color, background: `${s.color}18` }}>
                  {s.icon}
                </div>
                <div className="passport-stat__val">{s.value}</div>
                <div className="passport-stat__label">{s.label}</div>
                <div className="passport-stat__sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="passport-card-full__divider" />

          {/* Monthly timeline */}
          <div className="passport-card-full__section">
            <div className="passport-card-full__section-title">
              Payment history
              <span className="tag" style={{ marginLeft: 10 }}>{profile.paymentCount} payments</span>
            </div>
            <div className="passport-timeline">
              {MONTHS.map((m, i) => {
                const paid = i < profile.monthsActive;
                const payment = paid ? profile.payments[profile.payments.length - 1 - (profile.monthsActive - 1 - i)] : null;
                return (
                  <div key={m} className={`passport-timeline__month ${paid ? 'passport-timeline__month--paid' : ''}`}>
                    <div className="passport-timeline__dot">
                      {paid ? <CheckCircle size={14} /> : <div className="passport-timeline__empty" />}
                    </div>
                    <div className="passport-timeline__label">{m}</div>
                    {paid && payment && (
                      <div className="passport-timeline__amount">${payment.amountUSDC}</div>
                    )}
                    {paid && !payment && (
                      <div className="passport-timeline__amount">${Math.round(monthlyAvg)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="passport-card-full__divider" />

          {/* Recent attestations */}
          <div className="passport-card-full__section">
            <div className="passport-card-full__section-title">
              EAS Attestations
              <span className="tag badge-teal" style={{ marginLeft: 10, padding: '2px 8px', fontSize: 11 }}>Non-revocable</span>
            </div>
            <div className="passport-attestations">
              {profile.payments.map((p, i) => (
                <div key={p.id} className="passport-attest-row">
                  <div className="passport-attest-row__left">
                    <div className="passport-attest-row__icon">
                      <Shield size={13} color="var(--teal)" />
                    </div>
                    <div>
                      <div className="passport-attest-row__uid">
                        {p.attestationUID || `0x${Math.random().toString(16).slice(2, 18)}...`}
                      </div>
                      <div className="passport-attest-row__date">
                        {formatDate(p.paidAt)} · from {p.employerName}
                      </div>
                    </div>
                  </div>
                  <div className="passport-attest-row__right">
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>
                      +${p.amountUSDC}
                    </span>
                    <a
                      href={`https://sepolia.basescan.org/tx/${p.txHash}`}
                      target="_blank" rel="noreferrer"
                      className="passport-attest-row__link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit section */}
          {profile.creditEligible && (
            <>
              <div className="passport-card-full__divider" />
              <div className="passport-card-full__section">
                <div className="passport-card-full__section-title">
                  DeFi Credit Line
                </div>
                <div className="passport-credit-banner">
                  <div className="passport-credit-banner__icon">
                    <CheckCircle size={20} color="var(--green)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
                      Credit eligible — up to ${profile.creditLimit} USDC
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                      Based on 30% of 3-month average income · 4% APR · 30-day term
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="passport-card-full__footer">
            <div className="passport-card-full__footer-brand">
              <div style={{ width: 22, height: 22, background: 'var(--base-blue)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={12} fill="white" color="white" />
              </div>
              <span>PayPath</span>
            </div>
            <div className="passport-card-full__footer-attestation">
              <Lock size={12} />
              Attested on Base via EAS · Worker-owned · Non-revocable
            </div>
            <a href={`https://sepolia.easscan.org`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-accent)' }}>
              Verify on EAS <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Share CTA */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Share your income passport with employers, lenders, or DeFi protocols
          </div>
          <button className="btn-primary" onClick={handleCopy}>
            <Share2 size={15} />
            {copied ? 'Link copied!' : 'Share passport'}
          </button>
        </div>
      </div>
    </div>
  );
}
