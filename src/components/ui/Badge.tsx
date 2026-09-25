import { cn } from '@/lib/utils';
import type { RiskLevel, Prediction, AlertStatus } from '@/types';

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const styles: Record<RiskLevel, string> = {
    Low: 'bg-risk-low/15 text-risk-low border-risk-low/30',
    Medium: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
    High: 'bg-risk-high/15 text-risk-high border-risk-high/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border', styles[level], className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', level === 'Low' ? 'bg-risk-low' : level === 'Medium' ? 'bg-risk-medium' : 'bg-risk-high')} />
      {level} Risk
    </span>
  );
}

export function PredictionBadge({ prediction, className }: { prediction: Prediction; className?: string }) {
  const styles: Record<Prediction, string> = {
    Legitimate: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Suspicious: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Fraudulent: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border', styles[prediction], className)}>
      {prediction}
    </span>
  );
}

export function AlertStatusBadge({ status, className }: { status: AlertStatus; className?: string }) {
  const styles: Record<AlertStatus, string> = {
    New: 'bg-red-500/15 text-red-400 border-red-500/30',
    Investigating: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border', styles[status], className)}>
      {status}
    </span>
  );
}

export function StatusDot({ status }: { status: 'Operational' | 'Warning' | 'Offline' }) {
  const colors = { Operational: 'bg-emerald-400', Warning: 'bg-amber-400', Offline: 'bg-red-400' };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', colors[status])} />
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', colors[status])} />
    </span>
  );
}
