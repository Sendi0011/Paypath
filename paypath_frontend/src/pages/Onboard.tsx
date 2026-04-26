'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../context/WalletContext';
import { useApp } from '../context/AppContext';
import { Building2, User, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import './Dashboard.css';

export default function Onboard() {
  const router = useRouter();
  const { isConnected, connect, isConnecting } = useWallet();
  const { setRole, addNotification } = useApp();
  const [selected, setSelected] = useState<'employer'|'worker'|null>(null);
  const [registering, setRegistering] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    if (!isConnected) {
      await connect();
      return;
    }
    setRegistering(true);
    addNotification({ type: 'loading', title: `Registering as ${selected}...`, message: 'Signing transaction on Base Sepolia...' });
    await new Promise(r => setTimeout(r, 2000));
    addNotification({
      type: 'success',
      title: `Registered as ${selected}!`,
      message: `Your PayPath ${selected} account is live on Base.`,
      txHash: '0x' + Math.random().toString(16).slice(2, 66),
    });
    setRole(selected);
    setRegistering(false);
    router.push(selected === 'employer' ? '/employer' : '/worker');
  };

  return (
    <div className="onboard">
      <div className="onboard__inner">
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:32 }}>
          <div style={{ width:40,height:40,background:'var(--base-blue)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Zap size={20} fill="white" color="white"/>
          </div>
          <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700 }}>PayPath</span>
        </div>

        <h1 className="onboard__title">How will you use PayPath?</h1>
        <p className="onboard__sub">Choose your role to get started. You can switch anytime.</p>

        <div className="onboard__cards">
          {/* Employer card */}
          <div
            className={`onboard__card`}
            onClick={() => setSelected('employer')}
            style={selected === 'employer' ? { borderColor:'var(--base-blue)', background:'var(--bg-card-2)', transform:'translateY(-3px)', boxShadow:'0 12px 40px rgba(0,82,255,0.15)' } : {}}
          >
            {selected === 'employer' && (
              <div style={{ position:'absolute', top:16, right:16 }}>
                <CheckCircle size={20} color="var(--base-blue)" />
              </div>
            )}
            <div className="onboard__card-icon" style={{ background:'rgba(0,82,255,0.12)', color:'var(--base-blue)' }}>
              <Building2 size={24}/>
            </div>
            <div className="onboard__card-title">Employer / Startup</div>
            <div className="onboard__card-desc">
              Pay your global team in USDC automatically. Set up AI-powered payroll in 60 seconds.
            </div>
            <div className="onboard__card-features">
              {['AI payroll automation','Basenames support','Onchain audit trail','1.5% fee per payment'].map(f => (
                <div key={f} className="onboard__card-feature">
                  <CheckCircle size={13} color="var(--base-blue)"/> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Worker card */}
          <div
            className={`onboard__card`}
            onClick={() => setSelected('worker')}
            style={selected === 'worker' ? { borderColor:'var(--teal)', background:'var(--bg-card-2)', transform:'translateY(-3px)', boxShadow:'0 12px 40px rgba(0,212,170,0.1)' } : {}}
          >
            {selected === 'worker' && (
              <div style={{ position:'absolute', top:16, right:16 }}>
                <CheckCircle size={20} color="var(--teal)" />
              </div>
            )}
            <div className="onboard__card-icon" style={{ background:'rgba(0,212,170,0.12)', color:'var(--teal)' }}>
              <User size={24}/>
            </div>
            <div className="onboard__card-title">Freelancer / Worker</div>
            <div className="onboard__card-desc">
              Receive USDC payments, build your income passport, and access DeFi credit.
            </div>
            <div className="onboard__card-features">
              {['Receive USDC instantly','Verified income passport','DeFi credit line','Local currency offramp'].map(f => (
                <div key={f} className="onboard__card-feature">
                  <CheckCircle size={13} color="var(--teal)"/> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop:32, display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
          <button
            className="btn-primary"
            style={{ fontSize:16, padding:'14px 36px', opacity: selected ? 1 : 0.4, cursor: selected ? 'pointer' : 'not-allowed', width:'100%', maxWidth:320, justifyContent:'center' }}
            onClick={handleContinue}
            disabled={!selected || registering || isConnecting}
          >
            {registering || isConnecting
              ? <><span className="spinner"/> {isConnecting ? 'Connecting...' : 'Registering...'}</>
              : <>{!isConnected ? 'Connect & continue' : 'Continue'} <ArrowRight size={16}/></>}
          </button>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>
            Free to start · No credit card required · Runs on Base Sepolia
          </div>
        </div>
      </div>
    </div>
  );
}
