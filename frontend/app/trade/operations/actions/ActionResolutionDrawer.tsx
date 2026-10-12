'use client';

import React from 'react';
import Drawer from '@/components/v2/Drawer';
import { BrandButton, BrandBadge, BrandCard } from '@/components/ui/brand';
import { AlertCircle, Loader2, UserCheck } from 'lucide-react';
import { components } from '@/types/api';
import { ResolutionFormData } from './types';

type StoreActionResponse = components['schemas']['StoreActionResponse'];

interface ActionResolutionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  selectedAction: StoreActionResponse | null;
  resolutionData: ResolutionFormData;
  setResolutionData: React.Dispatch<React.SetStateAction<ResolutionFormData>>;
  objectiveMap: Record<string, string>;
  handleResolveAction: (e: React.FormEvent) => Promise<void>;
}

export function ActionResolutionDrawer({
  isOpen,
  onClose,
  loading,
  error,
  selectedAction,
  resolutionData,
  setResolutionData,
  objectiveMap,
  handleResolveAction,
}: ActionResolutionDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Tactical Action Detail"
      subtitle="Resolve strategies, input results, and fulfill account objectives."
      size="wide"
      footer={
        <div className="flex gap-4">
          <BrandButton
            variant="secondary"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </BrandButton>
          <BrandButton
            variant="primary"
            size="lg"
            onClick={handleResolveAction}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save Desk Log'}
          </BrandButton>
        </div>
      }
    >
      {selectedAction && (
        <form onSubmit={handleResolveAction} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-alert rounded-xl border border-red-200 text-sm font-semibold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Quick action info */}
          <BrandCard className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-deep">{selectedAction.store_name || 'Target Account'}</h4>
              <BrandBadge variant="neutral" className="uppercase text-2xs tracking-wider">
                {selectedAction.category}
              </BrandBadge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate font-medium block">Objective</span>
                <span className="font-bold text-deep">
                  {objectiveMap[selectedAction.objective] || selectedAction.objective}
                </span>
              </div>
              <div>
                <span className="text-slate font-medium block">Template Specs</span>
                <span className="font-bold text-deep">
                  {selectedAction.template_name || 'Manual Ingestion'}
                </span>
              </div>
            </div>
          </BrandCard>

          {!!(
            (selectedAction.details as Record<string, unknown> | undefined)?.title ||
            (selectedAction.details as Record<string, unknown> | undefined)?.description ||
            (selectedAction.details as Record<string, unknown> | undefined)?.target_value
          ) && (
            <div className="p-5 bg-card/60 rounded-xl space-y-3 border border-utility">
              {!!(selectedAction.details as Record<string, unknown> | undefined)?.title && (
                <div>
                  <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">
                    Main Action
                  </span>
                  <h4 className="text-sm font-bold text-deep mt-0.5">
                    {(selectedAction.details as Record<string, unknown>).title as string}
                  </h4>
                </div>
              )}
              {!!(selectedAction.details as Record<string, unknown> | undefined)?.description && (
                <div>
                  <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">
                    Description / Guidelines
                  </span>
                  <p className="text-xs text-slate mt-1 whitespace-pre-line leading-relaxed">
                    {(selectedAction.details as Record<string, unknown>).description as string}
                  </p>
                </div>
              )}
              {!!(selectedAction.details as Record<string, unknown> | undefined)?.target_value && (
                <div>
                  <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">
                    Target Goal
                  </span>
                  <span className="text-sm font-mono font-bold text-deep mt-0.5">
                    {String((selectedAction.details as Record<string, unknown>).target_value)}{' '}
                    <span className="text-2xs font-sans text-slate uppercase font-semibold">
                      {selectedAction.result_unit || 'units'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status Select */}
          <div>
            <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
              Execute Status
            </label>
            <select
              className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
              value={resolutionData.status}
              onChange={(e) => setResolutionData({ ...resolutionData, status: e.target.value })}
            >
              <option value="pending">Pending Operational Sync</option>
              <option value="proposed">Proposed Draft Note</option>
              <option value="completed">Completed & Fulfill Specs</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Strict outcome validation conditional inputs */}
          {resolutionData.status === 'completed' && (
            <div className="p-5 bg-confirmed/5 rounded-xl space-y-5 border border-confirmed/20 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2">
                <UserCheck className="text-confirmed" size={18} />
                <h4 className="text-xs font-bold text-deep uppercase tracking-wider">
                  Execution Metrics (Required)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-deep uppercase tracking-wider block ml-1 mb-2">
                    Result Value ({selectedAction.result_unit || 'units'})
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5, 12.5"
                    className="w-full p-3.5 bg-white border border-utility rounded-xl font-mono text-deep outline-none focus:border-deep"
                    value={resolutionData.result_value}
                    onChange={(e) => setResolutionData({ ...resolutionData, result_value: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-deep uppercase tracking-wider block ml-1 mb-2">
                    Revenue Impact ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional revenue gen"
                    className="w-full p-3.5 bg-white border border-utility rounded-xl font-mono text-deep outline-none focus:border-deep"
                    value={resolutionData.revenue_impact}
                    onChange={(e) => setResolutionData({ ...resolutionData, revenue_impact: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-deep uppercase tracking-wider block ml-1 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Rep logging details on execution outcome..."
                  className="w-full p-3.5 bg-white border border-utility rounded-xl outline-none focus:border-deep font-medium text-deep resize-none text-sm leading-relaxed"
                  value={resolutionData.resolution_notes}
                  onChange={(e) => setResolutionData({ ...resolutionData, resolution_notes: e.target.value })}
                />
              </div>
            </div>
          )}
        </form>
      )}
    </Drawer>
  );
}
