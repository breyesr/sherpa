'use client';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore, type ToastVariant } from '@/lib/store/ToastManager';

const variantStyles: Record<ToastVariant, { container: string; icon: JSX.Element }> = {
  success: {
    container: 'bg-white border-emerald-200 text-gray-900',
    icon: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />,
  },
  error: {
    container: 'bg-white border-red-200 text-gray-900',
    icon: <AlertCircle size={18} className="text-red-600 shrink-0" />,
  },
  info: {
    container: 'bg-white border-blue-200 text-gray-900',
    icon: <Info size={18} className="text-blue-600 shrink-0" />,
  },
};

/** Single mount point for global toasts. Rendered once in the root layout, above all drawers. */
export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      style={{ zIndex: 1000 }}
    >
      {toasts.map((t) => {
        const style = variantStyles[t.variant];
        return (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg animate-toast-in ${style.container}`}
          >
            {style.icon}
            <p className="flex-1 text-sm font-semibold leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-toast-in { animation: toast-in 200ms ease-out; }
      `}</style>
    </div>
  );
}
