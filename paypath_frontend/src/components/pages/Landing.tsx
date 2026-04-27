'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../context/WalletContext';
import {
  ArrowRight, Shield, Zap, Globe, TrendingUp, CheckCircle,
  Users, DollarSign, Clock, Lock, ExternalLink, ChevronRight,
  Wallet, FileText, CreditCard, Star
} from 'lucide-react';
import './Landing.css';

// Animated counter
function Counter({ to, prefix = '', suffix = '', duration = 2000 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const progress = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          setVal(Math.floor(ease * to));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);

  return <div ref={ref}>{prefix}{val.toLocaleString()}{suffix}</div>;
}

// Orbit animation orbs
function OrbitSystem() {
  return (
    <div className="orbit-system">
      <div className="orbit-center">
        <Zap size={24} fill="white" color="white" />
      </div>
      <div className="orbit orbit-1">
        <div className="orbit-planet orbit-planet--blue">
          <DollarSign size={12} />
        </div>
      </div>
      <div className="orbit orbit-2">
        <div className="orbit-planet orbit-planet--teal">
          <Shield size={12} />
        </div>
      </div>
      <div className="orbit orbit-3">
        <div className="orbit-planet orbit-planet--gold">
          <Globe size={12} />
        </div>
      </div>

      {/* Demo badge */}
      <div className="demo-badge">
        <div className="demo-badge__dot" />
        Demo mode · Base Sepolia
      </div>
    </div>
  );
}

// Live transaction ticker
const DEMO_TXS = [
  { from: 'acmecorp.base.eth', to: 'amara.base.eth', amount: '$800', time: '2s ago' },
  { from: 'techstartup.base.eth', to: 'kemi.base.eth', amount: '$1,200', time: '18s ago' },
  { from: 'remotelab.base.eth', to: 'oluwaseun.base.eth', amount: '$650', time: '45s ago' },
  { from: 'webagency.base.eth', to: 'dev3.base.eth', amount: '$2,400', time: '1m ago' },
  { from: 'designco.base.eth', to: 'aisha.base.eth', amount: '$900', time: '2m ago' },
];

export default function Landing() {
  const router = useRouter();
  const { connect, isConnected } = useWallet();
  const [activeTx, setActiveTx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTx(prev => (prev + 1) % DEMO_TXS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    if (isConnected) router.push('/onboard');
    else connect().then(() => router.push('/onboard'));
  };

  return (
    <div className="landing">
      {/* ── HERO ─────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__grid-bg grid-bg" />
        {/* Glow orbs */}
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />

        <div className="hero__inner">
          <div className="hero__content">
            <div className="hero__eyebrow">
              <span className="badge badge-blue">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                Built on Base · Powered by AgentKit
              </span>
            </div>

            <h1 className="hero__headline">
              The financial layer<br />
              <span className="shimmer-text">gig workers never had</span>
            </h1>

            <p className="hero__sub">
              AI-automated USDC payroll. Verifiable onchain income history.
              Instant DeFi credit — for 1.5 billion workers invisible to finance.
            </p>

            <div className="hero__actions">
              <button className="btn-primary hero__cta" onClick={handleGetStarted}>
                Get started free
                <ArrowRight size={16} />
              </button>
              <button className="btn-secondary" onClick={() => router.push('/worker')}>
                I'm a worker
              </button>
            </div>

            <div className="hero__trust">
              <div className="hero__trust-item">
                <CheckCircle size={14} color="var(--green)" />
                <span>No wire fees</span>
              </div>
              <div className="hero__trust-item">
                <CheckCircle size={14} color="var(--green)" />
                <span>Instant settlement</span>
              </div>
              <div className="hero__trust-item">
                <CheckCircle size={14} color="var(--green)" />
                <span>Verifiable on Base</span>
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="hero__visual">
            <OrbitSystem />

            {/* Live payment card */}
            <div className="hero__live-card">
              <div className="hero__live-header">
                <span className="hero__live-dot" />
                <span>Live payments</span>
              </div>
              {DEMO_TXS.map((tx, i) => (
                <div key={i} className={`hero__tx ${i === activeTx ? 'hero__tx--active' : ''}`}>
                  <div className="hero__tx-info">
                    <div className="hero__tx-arrow">
                      <div className="hero__tx-from">{tx.from}</div>
                      <ChevronRight size={12} color="var(--text-muted)" />
                      <div className="hero__tx-to">{tx.to}</div>
                    </div>
                    <div className="hero__tx-time">{tx.time}</div>
                  </div>
                  <div className="hero__tx-amount">{tx.amount}</div>
                </div>
              ))}
            </div>

            {/* Income passport card */}
            <div className="hero__passport-card">
              <div className="hero__passport-header">
                <FileText size={14} color="var(--teal)" />
                <span>Income Passport</span>
                <span className="badge badge-teal" style={{ fontSize: 10, padding: '2px 8px' }}>Verified</span>
              </div>
              <div className="hero__passport-name">amara.base.eth</div>
              <div className="hero__passport-months">
                {[1,2,3,4].map(m => (
                  <div key={m} className="hero__passport-month hero__passport-month--filled">
                    <CheckCircle size={10} />
                  </div>
                ))}
                {[5,6].map(m => (
                  <div key={m} className="hero__passport-month" />
                ))}
              </div>
              <div className="hero__passport-stat">
                <span className="hero__passport-val">$3,200</span>
                <span className="hero__passport-lbl">verified income</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────── */}
      <section className="stats-bar">
        <div className="stats-bar__inner">
          {[
            { val: 600, suffix: 'B+', label: 'Gig remittances / yr', prefix: '$' },
            { val: 1500000000, suffix: '', label: 'Unbanked workers', prefix: '' },
            { val: 8, suffix: '%', label: 'Avg wire fee lost', prefix: '' },
            { val: 0, suffix: ' sec', label: 'Settlement time on Base', prefix: '<1' },
          ].map((s, i) => (
            <div key={i} className="stats-bar__stat">
              <div className="stats-bar__val">
                {s.prefix && s.prefix !== '$' ? <span>{s.prefix}</span> : null}
                {s.prefix === '$' && <span>$</span>}
                {s.val > 0 ? <Counter to={s.val} suffix={s.suffix} /> : <span>{'<1 sec'}</span>}
              </div>
              <div className="stats-bar__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* ── LIVE TICKER ─────────────────────────────── */}
      <div className="ticker">
        <div className="ticker__track">
          {[...Array(2)].map((_, repeat) => (
            <React.Fragment key={repeat}>
              {[
                { from: 'acmecorp.base.eth', to: 'amara.base.eth', amount: '$800', time: '2s ago' },
                { from: 'techstartup.base.eth', to: 'kemi.base.eth', amount: '$1,200', time: '18s ago' },
                { from: 'remotelab.base.eth', to: 'oluwaseun.base.eth', amount: '$650', time: '45s ago' },
                { from: 'webagency.base.eth', to: 'dev3.base.eth', amount: '$2,400', time: '1m ago' },
                { from: 'designco.base.eth', to: 'aisha.base.eth', amount: '$900', time: '2m ago' },
                { from: 'stripe-alt.base.eth', to: 'chidi.base.eth', amount: '$3,100', time: '3m ago' },
                { from: 'buildco.base.eth', to: 'fatima.base.eth', amount: '$500', time: '5m ago' },
              ].map((tx, i) => (
                <div key={`${repeat}-${i}`} className="ticker__item">
                  <span>{tx.from}</span>
                  <span className="ticker__item-arrow">→</span>
                  <span>{tx.to}</span>
                  <span className="ticker__item-amount">{tx.amount} USDC</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{tx.time}</span>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────── */}
      <section id="how-it-works" className="hiw section">
        <div className="section__inner">
          <div className="section__header reveal">
            <span className="badge badge-blue">How it works</span>
            <h2 className="section__title">From setup to credit in minutes</h2>
            <p className="section__sub">Five steps that replace a broken system</p>
          </div>

          <div className="hiw__steps">
            {[
              {
                num: '01', icon: <Wallet size={22} />, color: 'var(--base-blue)',
                title: 'Connect your wallet',
                desc: 'Employers and workers connect via Coinbase Smart Wallet. No seed phrases. No complexity. Just an email.',
                tag: 'Coinbase Smart Wallet',
              },
              {
                num: '02', icon: <Zap size={22} />, color: 'var(--teal)',
                title: 'AI sets up payroll',
                desc: 'Type "Pay amara.base.eth $800 monthly" — our AgentKit-powered AI agent configures the schedule automatically.',
                tag: 'Base AgentKit + x402',
              },
              {
                num: '03', icon: <DollarSign size={22} />, color: 'var(--gold)',
                title: 'USDC lands instantly',
                desc: 'Payment fires on Base. Worker receives USDC in seconds. A receipt NFT is minted as tamper-proof record.',
                tag: 'Base Mainnet',
              },
              {
                num: '04', icon: <FileText size={22} />, color: 'var(--purple)',
                title: 'Income passport builds',
                desc: 'Every payment adds a verified credential on Base via EAS. Workers own their history — forever. No bank required.',
                tag: 'EAS Attestations',
              },
              {
                num: '05', icon: <CreditCard size={22} />, color: 'var(--green)',
                title: 'Credit unlocked',
                desc: 'After 3 months of consistent income, workers unlock a DeFi credit line. Borrow USDC against your proven track record.',
                tag: 'DeFi Credit',
              },
            ].map((step, i) => (
              <div key={i} className="hiw__step">
                <div className="hiw__step-num" style={{ color: step.color }}>{step.num}</div>
                <div className="hiw__step-icon" style={{ background: `${step.color}18`, border: `1px solid ${step.color}30`, color: step.color }}>
                  {step.icon}
                </div>
                <div className="hiw__step-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  <span className="tag">{step.tag}</span>
                </div>
                {i < 4 && <div className="hiw__connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────── */}
      <section id="features" className="features section">
        <div className="section__inner">
          <div className="section__header reveal">
            <span className="badge badge-teal">Features</span>
            <h2 className="section__title">Everything payroll needs. Nothing it doesn't.</h2>
          </div>

          <div className="features__grid">
            {[
              {
                icon: <Zap size={24} />, color: 'var(--base-blue)',
                title: 'AI-powered scheduling',
                desc: 'Natural language payroll setup. "Pay 5 contractors every 15th" takes 10 seconds.',
                big: true,
              },
              {
                icon: <Shield size={24} />, color: 'var(--teal)',
                title: 'Onchain income passport',
                desc: 'EAS-verified credentials. Workers own their history, portable across any DeFi protocol.',
              },
              {
                icon: <Globe size={24} />, color: 'var(--gold)',
                title: 'Global offramp',
                desc: 'USDC → M-Pesa, Pix, GCash. Local currency in one tap.',
              },
              {
                icon: <CreditCard size={24} />, color: 'var(--green)',
                title: 'DeFi credit line',
                desc: 'Borrow against verified income. No credit check. No bank.',
                big: true,
              },
              {
                icon: <TrendingUp size={24} />, color: 'var(--purple)',
                title: 'Real-time analytics',
                desc: 'Payroll volume, worker payment history, and credit utilisation at a glance.',
              },
              {
                icon: <Lock size={24} />, color: 'var(--red)',
                title: 'Audit trail',
                desc: 'Every payment is permanently recorded on Base. Tax-ready exports included.',
              },
            ].map((f, i) => (
              <div key={i} className={`features__card card-glow ${f.big ? 'features__card--big' : ''}`}>
                <div className="features__icon" style={{ background: `${f.color}18`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="features__title">{f.title}</h3>
                <p className="features__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR WORKERS ───────────────────────────── */}
      <section id="for-workers" className="workers section">
        <div className="section__inner">
          <div className="workers__layout">
            <div className="workers__content">
              <span className="badge badge-teal">For workers</span>
              <h2 className="section__title" style={{ textAlign: 'left', marginTop: 16 }}>
                Your income is real.<br />
                Now prove it.
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginTop: 16 }}>
                78% of gig workers are denied credit — not because they don't earn, but because their earnings aren't visible to any system banks trust. PayPath changes that forever.
              </p>
              <div className="workers__bullets">
                {[
                  'Receive USDC directly to your Coinbase Smart Wallet',
                  'Build a verified income history with every payment',
                  'Access DeFi credit after 3 months — no bank, no rejection',
                  'Offramp to local currency instantly',
                  'Own your financial identity forever — onchain',
                ].map((b, i) => (
                  <div key={i} className="workers__bullet">
                    <CheckCircle size={16} color="var(--teal)" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={() => router.push('/worker')} style={{ marginTop: 28 }}>
                View worker dashboard <ArrowRight size={16} />
              </button>
            </div>

            {/* Passport mockup */}
            <div className="workers__passport">
              <div className="passport-card card-glow">
                <div className="passport-card__header">
                  <div className="passport-card__avatar">A</div>
                  <div>
                    <div className="passport-card__name">amara.base.eth</div>
                    <div className="passport-card__since">Member since Jan 2025</div>
                  </div>
                  <span className="badge badge-teal" style={{ marginLeft: 'auto' }}>Verified</span>
                </div>
                <div className="divider" />
                <div className="passport-card__stats">
                  <div>
                    <div className="stat-value" style={{ fontSize: 22 }}>$3,200</div>
                    <div className="stat-label">Total earned</div>
                  </div>
                  <div>
                    <div className="stat-value" style={{ fontSize: 22 }}>4</div>
                    <div className="stat-label">Months active</div>
                  </div>
                  <div>
                    <div className="stat-value" style={{ fontSize: 22, color: 'var(--green)' }}>$288</div>
                    <div className="stat-label">Credit limit</div>
                  </div>
                </div>
                <div className="passport-card__timeline-label">Payment history</div>
                <div className="passport-card__timeline">
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m, i) => (
                    <div key={m} className={`passport-card__month ${i < 4 ? 'passport-card__month--paid' : ''}`}>
                      <div className="passport-card__month-dot">
                        {i < 4 && <CheckCircle size={10} />}
                      </div>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
                <div className="passport-card__attestation">
                  <Lock size={12} color="var(--text-muted)" />
                  <span>Attested on Base via EAS · Non-revocable</span>
                  <ExternalLink size={11} color="var(--base-blue-light)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────── */}
      <section className="social section">
        <div className="section__inner">
          <div className="section__header reveal">
            <h2 className="section__title">Built on the best stack in Web3</h2>
          </div>
          <div className="social__logos">
            {['Base', 'Coinbase', 'AgentKit', 'EAS', 'USDC', 'Basenames'].map(name => (
              <div key={name} className="social__logo">
                <span>{name}</span>
              </div>
            ))}
          </div>
          <div className="social__quotes">
            {[
              { quote: "Base is purpose-built for stablecoin payments and AI agents — exactly what PayPath needs to scale globally.", author: "Base 2026 Strategy", role: "Official roadmap" },
              { quote: "The future of finance is onchain, and gig workers deserve access to the same tools as Fortune 500 companies.", author: "Demo Day judge quote", role: "Base Batches 2026" },
              { quote: "Sending money across borders shouldn't cost 8% and take a week. PayPath makes it instant and nearly free.", author: "Beta user · Lagos, Nigeria", role: "Freelance developer" },
            ].map((q, i) => (
              <div key={i} className="social__quote card">
                <div className="social__stars">
                  {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="var(--gold)" color="var(--gold)" />)}
                </div>
                <p className="social__quote-text">"{q.quote}"</p>
                <div className="social__quote-author">
                  <div className="social__quote-name">{q.author}</div>
                  <div className="social__quote-role">{q.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────── */}
      <section className="cta section">
        <div className="section__inner">
          <div className="cta__card card-glow">
            <div className="cta__orb" />
            <span className="badge badge-blue">Get started today</span>
            <h2 className="cta__title">The workers are ready.<br />The rails are live.</h2>
            <p className="cta__sub">Join as an employer to pay your team, or as a worker to start building your income passport.</p>
            <div className="cta__actions">
              <button className="btn-primary" onClick={() => router.push('/onboard')} style={{ fontSize: 16, padding: '14px 28px' }}>
                Start as employer <ArrowRight size={16} />
              </button>
              <button className="btn-secondary" onClick={() => router.push('/worker')} style={{ fontSize: 16, padding: '14px 28px' }}>
                I'm a worker
              </button>
            </div>
            <div className="cta__note">Free to start · 1.5% payroll fee · No hidden costs</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <div className="navbar__logo-mark" style={{ width: 28, height: 28, background: 'var(--base-blue)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} fill="white" color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>PayPath</span>
          </div>
          <div className="footer__links">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://basescan.org" target="_blank" rel="noreferrer">BaseScan</a>
          </div>
          <div className="footer__copy">
            © 2026 PayPath · Built on Base · Base Batches Student Track
          </div>
        </div>
      </footer>

      {/* Demo badge */}
      <div className="demo-badge">
        <div className="demo-badge__dot" />
        Demo mode · Base Sepolia
      </div>
    </div>
  );
}
