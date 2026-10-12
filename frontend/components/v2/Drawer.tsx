'use client';

import { useEffect, useState, ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'standard' | 'wide' | 'full';
}

/**
 * Number of drawers currently open (store-driven or local).
 * Drives both scroll locking and stacking order: a drawer opened while N others are open
 * renders at depth N, above all of them.
 */
let openDepth = 0;
const BASE_Z = 40;
const Z_STEP = 20;

export default function Drawer({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children, 
  footer,
  size = 'standard' 
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  // Retained after close so the exit animation stays at the same layer.
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setDepth(openDepth);
    openDepth += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      openDepth = Math.max(0, openDepth - 1);
      if (openDepth === 0) document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  const sizeClasses = {
    standard: 'md:w-[500px]',
    wide: 'md:w-[700px]',
    full: 'md:w-[90vw]'
  };

  const backdropZ = BASE_Z + depth * Z_STEP;
  const panelZ = backdropZ + 10;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: backdropZ }}
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full ${sizeClasses[size]} bg-white shadow-2xl transition-transform duration-500 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
        style={{ zIndex: panelZ }}
      >
        {/* Header */}
        <div className="p-8 md:p-10 border-b border-gray-50 bg-gray-50/30 shrink-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                {title}
              </h2>
              {subtitle && (
                <p className="text-gray-500 font-medium text-base">
                  {subtitle}
                </p>
              )}
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all active:scale-95"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-8 md:p-10 border-t border-gray-50 bg-white shrink-0">
            {footer}
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e5e7eb;
        }
      `}</style>
    </>
  );
}
