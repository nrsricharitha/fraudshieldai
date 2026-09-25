import { cn } from '@/lib/utils';

export function RiskGauge({ score, size = 180 }: { score: number; size?: number }) {
  const radius = size / 2 - 16;
  const circumference = Math.PI * radius;
  const pct = Math.min(score, 100) / 100;
  const offset = circumference - pct * circumference;
  const color = score >= 71 ? '#ef4444' : score >= 31 ? '#f59e0b' : '#22c55e';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20} className="overflow-visible">
        <path
          d={`M ${16} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 16} ${size / 2}`}
          fill="none"
          stroke="#1c2330"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={`M ${16} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 16} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-4xl font-bold text-slate-100" style={{ color }}>{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

export function RiskBar({ score, className }: { score: number; className?: string }) {
  const color = score >= 71 ? 'bg-risk-high' : score >= 31 ? 'bg-risk-medium' : 'bg-risk-low';
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-ink-700 overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${score}%` }} />
    </div>
  );
}

export function ProgressBar({ value, color = '#3385ff', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-2 w-full rounded-full bg-ink-700 overflow-hidden', className)}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}
