"use client";
import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ValidationIssue } from '@/lib/mission/types';

export function Panel({ title, subtitle, children, className = '' }: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-xl p-4 sm:p-6 ${className}`}>
      {title && <h3 className="text-base font-semibold text-slate-200">{title}</h3>}
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      <div className={title || subtitle ? 'mt-4' : ''}>{children}</div>
    </div>
  );
}

export function Field({ id, label, hint, issues = [], children }: {
  id: string;
  label: string;
  hint?: string;
  issues?: ValidationIssue[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && issues.length === 0 && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      <IssueList issues={issues} id={`${id}-issues`} />
    </div>
  );
}

export function IssueList({ issues, id }: { issues: ValidationIssue[]; id?: string }) {
  if (issues.length === 0) return null;
  return (
    <ul id={id} className="mt-1.5 space-y-1" role="alert">
      {issues.map((issue, idx) => (
        <li
          key={`${issue.field}-${idx}`}
          className={`flex items-start gap-1.5 text-xs ${issue.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}`}
        >
          {issue.severity === 'error'
            ? <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
            : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />}
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function inputClass(hasError: boolean) {
  return `w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-rose-600 focus:border-rose-500 focus:ring-rose-500/40'
      : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/40'
  }`;
}

/** Clickable card used for spacecraft / launcher / instrument selection. */
export function SelectableCard({ selected, disabled, onClick, children, role = 'radio' }: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: 'radio' | 'checkbox';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative text-left w-full rounded-xl border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
        selected
          ? 'border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]'
          : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed hover:border-slate-800' : ''}`}
    >
      {selected && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-cyan-400" aria-hidden />}
      {children}
    </button>
  );
}

export function Stat({ label, value, tone = 'default' }: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'good' | 'bad' | 'warn';
}) {
  const color = { default: 'text-slate-200', good: 'text-emerald-400', bad: 'text-rose-400', warn: 'text-amber-400' }[tone];
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-mono font-semibold ${color} truncate`}>{value}</p>
    </div>
  );
}

export const fmt = (n: number | null | undefined, digits = 1) =>
  typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: digits }) : '—';
