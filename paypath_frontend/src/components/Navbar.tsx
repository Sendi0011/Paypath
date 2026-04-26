'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWallet } from '../context/WalletContext';
import { Wallet, Menu, X, Zap } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { address, isConnected, isConnecting, connect, disconnect, formatAddress } = useWallet();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isApp = pathname !== '/';

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''} ${isApp ? 'navbar--app' : ''}`}>
      <div className="navbar__inner">
        {/* Logo */}
        <button className="navbar__logo" onClick={() => router.push('/')}>
          <div className="navbar__logo-mark">
            <Zap size={16} fill="currentColor" />
          </div>
          <span>PayPath</span>
        </button>

        {/* Desktop nav links */}
        {!isApp && (
          <div className="navbar__links hide-mobile">
            <a href="#how-it-works" className="navbar__link">How it works</a>
            <a href="#features" className="navbar__link">Features</a>
            <a href="#for-workers" className="navbar__link">For workers</a>
          </div>
        )}

        {isApp && (
          <div className="navbar__links hide-mobile">
            <button className="navbar__link" onClick={() => router.push('/employer')}>Employer</button>
            <button className="navbar__link" onClick={() => router.push('/worker')}>Worker</button>
          </div>
        )}

        {/* Right side */}
        <div className="navbar__right">
          <span className="navbar__network badge badge-blue hide-mobile">
            <span className="navbar__dot" />
            Base Sepolia
          </span>

          {isConnected ? (
            <div className="navbar__wallet-connected">
              <button className="navbar__address" onClick={disconnect}>
                <Wallet size={14} />
                {formatAddress(address!)}
              </button>
            </div>
          ) : (
            <button className="btn-primary" onClick={connect} disabled={isConnecting} style={{ padding: '10px 20px', fontSize: '14px' }}>
              {isConnecting ? <><span className="spinner" style={{width:14,height:14}} /> Connecting...</> : <><Wallet size={14} /> Connect Wallet</>}
            </button>
          )}

          <button className="navbar__menu-btn hide-desktop" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu hide-desktop">
          {!isApp && <>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#for-workers" onClick={() => setMenuOpen(false)}>For workers</a>
          </>}
          {isApp && <>
            <button onClick={() => { router.push('/employer'); setMenuOpen(false); }}>Employer Dashboard</button>
            <button onClick={() => { router.push('/worker'); setMenuOpen(false); }}>Worker Dashboard</button>
          </>}
        </div>
      )}
    </nav>
  );
}
