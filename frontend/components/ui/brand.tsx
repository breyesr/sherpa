import React from 'react';

/**
 * Xerpa Brand System UI Components
 * Built against the Brand Kit tokens (Trailhead & Block)
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function BrandButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }[size];

  const variantClasses = {
    primary: 'bg-deep text-white hover:opacity-95 shadow-brand-subtle font-bold border border-transparent',
    accent: 'bg-dark-accent text-accent-ink hover:opacity-90 font-black shadow-brand-subtle border border-transparent',
    secondary: 'bg-white border border-utility text-slate hover:text-deep hover:border-slate/40 font-semibold',
    outline: 'border-2 border-deep text-deep bg-transparent hover:bg-deep/5 font-bold',
    ghost: 'text-slate hover:text-deep hover:bg-black/5 font-medium',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'confirmed' | 'attention' | 'alert' | 'accent' | 'neutral' | 'ear' | 'memory' | 'brain' | 'hands' | 'pending';
  className?: string;
}

export function BrandBadge({
  children,
  variant = 'neutral',
  className = '',
}: BadgeProps) {
  const variantStyles: Record<string, { bg: string; text: string; border: string }> = {
    confirmed: { bg: 'rgba(22, 112, 82, 0.12)', text: 'var(--success)', border: 'var(--success)' },
    attention: { bg: 'rgba(169, 102, 8, 0.12)', text: 'var(--warning)', border: 'var(--warning)' },
    pending: { bg: 'rgba(169, 102, 8, 0.12)', text: 'var(--warning)', border: 'var(--warning)' },
    alert: { bg: 'rgba(178, 59, 52, 0.12)', text: 'var(--alert)', border: 'var(--alert)' },
    accent: { bg: 'var(--dark-accent)', text: 'var(--accent-ink)', border: 'transparent' },
    neutral: { bg: 'rgba(0, 0, 0, 0.04)', text: 'var(--slate)', border: 'var(--utility)' },
    ear: { bg: 'var(--ear)', text: 'var(--ear-ink)', border: 'rgba(0,0,0,0.06)' },
    memory: { bg: 'var(--memory)', text: 'var(--memory-ink)', border: 'rgba(0,0,0,0.06)' },
    brain: { bg: 'var(--brain)', text: 'var(--brain-ink)', border: 'rgba(0,0,0,0.06)' },
    hands: { bg: 'var(--hands)', text: 'var(--hands-ink)', border: 'rgba(0,0,0,0.06)' },
  };

  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors duration-200 select-none ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      {children}
    </span>
  );
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function BrandCard({
  children,
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-utility p-6 shadow-brand-subtle transition-all duration-300 ${
        hoverable ? 'hover:shadow-brand-card hover:border-slate/30 hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
}

export function BrandInput({
  label,
  error,
  suffix,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-black uppercase tracking-wider text-slate/80">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        <input
          className={`w-full px-4 py-2.5 bg-white rounded-xl border border-utility text-deep font-medium placeholder:text-muted/60 outline-none transition-all duration-200 focus:border-deep focus:ring-2 focus:ring-deep/10 disabled:bg-black/5 disabled:opacity-60 ${
            suffix ? 'pr-14' : ''
          } ${error ? 'border-alert focus:border-alert focus:ring-alert/10' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 text-xs font-bold uppercase tracking-wider text-slate/60 select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span className="text-xs font-semibold text-alert mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}
