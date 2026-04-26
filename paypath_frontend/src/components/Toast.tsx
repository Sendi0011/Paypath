'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, XCircle, Info, ExternalLink, X } from 'lucide-react';
import './Toast.css';

export default function ToastContainer() {
  const { notifications, removeNotification } = useApp();
  return (
    <div className="toast-container">
      {notifications.map(n => (
        <div key={n.id} className={`toast toast--${n.type}`}>
          <div className="toast__icon">
            {n.type === 'success' && <CheckCircle size={18} />}
            {n.type === 'error'   && <XCircle size={18} />}
            {n.type === 'info'    && <Info size={18} />}
            {n.type === 'loading' && <span className="spinner" />}
          </div>
          <div className="toast__content">
            <div className="toast__title">{n.title}</div>
            {n.message && <div className="toast__msg">{n.message}</div>}
            {n.txHash && (
              <a href={`https://sepolia.basescan.org/tx/${n.txHash}`} target="_blank" rel="noreferrer" className="toast__link">
                View on BaseScan <ExternalLink size={11} />
              </a>
            )}
          </div>
          <button className="toast__close" onClick={() => removeNotification(n.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
