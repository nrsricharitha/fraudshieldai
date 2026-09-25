import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };
  return (
    <div className={cn('relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow', sizes[size], className)}>
      <Shield className={cn('text-white', iconSizes[size])} fill="white" fillOpacity={0.15} />
      <ShieldCheck className={cn('absolute text-white', iconSizes[size])} />
    </div>
  );
}

export function LogoWordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base';
  const subSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <div>
        <div className={cn('font-bold tracking-tight text-slate-100', titleSize)}>
          FraudShield <span className="text-gradient">AI</span>
        </div>
        <div className={cn('text-slate-500 font-medium', subSize)}>Real-Time Fraud & Anomaly Detection</div>
      </div>
    </div>
  );
}
