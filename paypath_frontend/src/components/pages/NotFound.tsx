'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 24,
      padding: 24, textAlign: 'center', position: 'relative',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,82,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'rgba(0,82,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Zap size={28} color="var(--base-blue)" />
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 800,
          color: 'var(--border-mid)', lineHeight: 1, marginBottom: 8,
        }}>404</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: 10,
        }}>Page not found</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>
          This page doesn't exist on Base — but your income passport does.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={() => router.push('/')}>
          <ArrowLeft size={15}/> Go home
        </button>
        <button className="btn-secondary" onClick={() => router.push('/worker')}>
          View income passport
        </button>
      </div>
    </div>
  );
}
