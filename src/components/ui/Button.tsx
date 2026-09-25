import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-glow',
    secondary: 'bg-ink-700 hover:bg-ink-600 text-slate-200',
    ghost: 'hover:bg-white/5 text-slate-400 hover:text-slate-100',
    danger: 'bg-risk-high/90 hover:bg-risk-high text-white',
    outline: 'border border-ink-600 hover:border-brand-500/50 text-slate-300 hover:text-brand-400',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], sizes[size], className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
