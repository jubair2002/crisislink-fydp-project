'use client';

import React from 'react';
import toast, { Toast as HotToast } from 'react-hot-toast';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface CustomToastProps {
  t: HotToast;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function ToastBanner({ t, title, message, type = 'info' }: CustomToastProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-slate-900',
    error: 'border-rose-500/30 bg-slate-900',
    warning: 'border-amber-500/30 bg-slate-900',
    info: 'border-cyan-500/30 bg-slate-900',
  };

  return (
    <div
      className={`max-w-md w-full border ${borders[type]} shadow-xl rounded-xl pointer-events-auto flex ring-1 ring-black/10 p-3.5 backdrop-blur-md`}
    >
      <div className="flex-1 w-0 flex items-start gap-3">
        {icons[type]}
        <div className="flex-1">
          <p className="text-sm font-semibold text-white tracking-tight">{title}</p>
          {message && <p className="mt-1 text-xs text-slate-300 leading-relaxed">{message}</p>}
        </div>
      </div>
      <div className="flex border-l border-slate-800 pl-2 ml-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="rounded-lg p-1 text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export const showToast = {
  success: (title: string, message?: string) =>
    toast.custom((t) => <ToastBanner t={t} title={title} message={message} type="success" />),
  error: (title: string, message?: string) =>
    toast.custom((t) => <ToastBanner t={t} title={title} message={message} type="error" />),
  warning: (title: string, message?: string) =>
    toast.custom((t) => <ToastBanner t={t} title={title} message={message} type="warning" />, {
      duration: 6000,
    }),
  info: (title: string, message?: string) =>
    toast.custom((t) => <ToastBanner t={t} title={title} message={message} type="info" />),
};

export default function ToastContainer() {
  return null;
}
