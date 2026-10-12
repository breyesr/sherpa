'use client';

import React from 'react';
import Drawer from '@/components/v2/Drawer';
import { BrandButton } from '@/components/ui/brand';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { components } from '@/types/api';
import { ActionFormData, StoreActionObjective } from './types';

type ActionTemplateResponse = components['schemas']['ActionTemplateResponse'];
type StoreResponse = components['schemas']['StoreResponse'];
type StoreClient = NonNullable<StoreResponse['clients']>[number];

interface AssignActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  actionFormData: ActionFormData;
  setActionFormData: React.Dispatch<React.SetStateAction<ActionFormData>>;
  stores: StoreResponse[];
  assigneesList: StoreClient[];
  filteredObjectives: StoreActionObjective[];
  objectiveMap: Record<string, string>;
  templates: ActionTemplateResponse[];
  handleCreateAction: (e: React.FormEvent) => Promise<void>;
  handleCategoryChange: (cat: 'COMMERCIAL' | 'MARKETING') => void;
  onOpenCreateTemplate: (defaults: { category: 'COMMERCIAL' | 'MARKETING'; objective: string }) => void;
}

export function AssignActionDrawer({
  isOpen,
  onClose,
  loading,
  error,
  actionFormData,
  setActionFormData,
  stores,
  assigneesList,
  filteredObjectives,
  objectiveMap,
  templates,
  handleCreateAction,
  handleCategoryChange,
  onOpenCreateTemplate,
}: AssignActionDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Action"
      subtitle="Deploy a strategy blueprint to a store and assign it to a rep."
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
            onClick={handleCreateAction}
            disabled={loading || !actionFormData.store_id || !actionFormData.template_id || !actionFormData.target_value}
            className="flex-1"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Dispatch Action'}
          </BrandButton>
        </div>
      }
    >
      <form onSubmit={handleCreateAction} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-alert rounded-xl border border-red-200 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Target Account Location
              </label>
              <select
                required
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
                value={actionFormData.store_id}
                onChange={(e) => setActionFormData({ ...actionFormData, store_id: e.target.value })}
              >
                <option value="">Select Account...</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Operational Rep (Assignee)
              </label>
              <select
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
                value={actionFormData.assigned_to_id}
                onChange={(e) => setActionFormData({ ...actionFormData, assigned_to_id: e.target.value })}
              >
                <option value="">Select Assigned Rep...</option>
                {assigneesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
              Category
            </label>
            <div className="flex gap-2 p-1 bg-canvas border border-utility rounded-xl">
              <button
                type="button"
                onClick={() => {
                  handleCategoryChange('COMMERCIAL');
                  setActionFormData((prev) => ({ ...prev, template_id: '', result_unit: '' }));
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${
                  actionFormData.category === 'COMMERCIAL'
                    ? 'bg-deep text-white shadow-sm'
                    : 'text-slate hover:text-deep'
                }`}
              >
                Commercial
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCategoryChange('MARKETING');
                  setActionFormData((prev) => ({ ...prev, template_id: '', result_unit: '' }));
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${
                  actionFormData.category === 'MARKETING'
                    ? 'bg-deep text-white shadow-sm'
                    : 'text-slate hover:text-deep'
                }`}
              >
                Marketing
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Task Objective
              </label>
              <select
                required
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
                value={actionFormData.objective}
                onChange={(e) =>
                  setActionFormData({
                    ...actionFormData,
                    objective: e.target.value,
                    template_id: '',
                    result_unit: '',
                  })
                }
              >
                {filteredObjectives.map((o) => (
                  <option key={o.name} value={o.name}>
                    {objectiveMap[o.name] || o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Select Action
              </label>
              {(() => {
                const matchingTemplates = templates.filter(
                  (t) => t.category === actionFormData.category && t.objective === actionFormData.objective
                );
                if (matchingTemplates.length === 0) {
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenCreateTemplate({
                          category: actionFormData.category,
                          objective: actionFormData.objective,
                        })
                      }
                      className="w-full p-3.5 bg-amber-50 border border-dashed border-amber-300 rounded-xl flex items-center gap-3 text-left hover:bg-amber-100/60 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-200/80 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-300 transition-colors">
                        <Plus size={14} className="text-amber-800" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-900">No actions created yet</p>
                        <p className="text-[10px] text-amber-700 mt-0.5">Click to create a reusable action template.</p>
                      </div>
                    </button>
                  );
                }
                return (
                  <select
                    required
                    className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
                    value={actionFormData.template_id}
                    onChange={(e) => {
                      const tplId = e.target.value;
                      const selectedTpl = templates.find((t) => t.id === tplId);
                      setActionFormData((prev) => ({
                        ...prev,
                        template_id: tplId,
                        result_unit: selectedTpl ? selectedTpl.default_unit : '',
                      }));
                    }}
                  >
                    <option value="">Choose Template Blueprint...</option>
                    {matchingTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          </div>

          {/* Blueprint Preview Card */}
          {actionFormData.template_id && (() => {
            const selectedTpl = templates.find((t) => t.id === actionFormData.template_id);
            if (!selectedTpl) return null;
            return (
              <div className="p-5 bg-card/60 border border-utility rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">
                  Blueprint Guidelines
                </span>
                <h4 className="text-sm font-bold text-deep">{selectedTpl.name}</h4>
                {selectedTpl.description && (
                  <p className="text-xs text-slate leading-relaxed whitespace-pre-line">
                    {selectedTpl.description}
                  </p>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Metric Goal {actionFormData.result_unit ? `(${actionFormData.result_unit})` : ''}
              </label>
              <input
                required
                type="number"
                step="0.01"
                placeholder={actionFormData.result_unit ? `Target in ${actionFormData.result_unit}` : 'e.g. 150'}
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-mono text-deep focus:border-deep outline-none"
                value={actionFormData.target_value}
                onChange={(e) => setActionFormData({ ...actionFormData, target_value: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Operational Deadline
              </label>
              <input
                type="date"
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-mono text-deep focus:border-deep outline-none"
                value={actionFormData.due_date}
                onChange={(e) => setActionFormData({ ...actionFormData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
              Impact Level
            </label>
            <select
              required
              className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
              value={actionFormData.impact_level}
              onChange={(e) => setActionFormData({ ...actionFormData, impact_level: e.target.value })}
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
            </select>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
