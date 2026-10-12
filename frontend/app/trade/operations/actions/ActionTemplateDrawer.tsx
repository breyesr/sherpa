'use client';

import React from 'react';
import Drawer from '@/components/v2/Drawer';
import { BrandButton } from '@/components/ui/brand';
import { AlertCircle, Loader2 } from 'lucide-react';
import { components } from '@/types/api';
import { TemplateFormData, StoreActionObjective, DEFAULT_OBJECTIVES } from './types';

type ActionTemplateResponse = components['schemas']['ActionTemplateResponse'];

interface ActionTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  selectedTemplate: ActionTemplateResponse | null;
  templateFormData: TemplateFormData;
  setTemplateFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  objectives: StoreActionObjective[];
  objectiveMap: Record<string, string>;
  handleCreateTemplate: (e: React.FormEvent) => Promise<void>;
}

export function ActionTemplateDrawer({
  isOpen,
  onClose,
  loading,
  error,
  selectedTemplate,
  templateFormData,
  setTemplateFormData,
  objectives,
  objectiveMap,
  handleCreateTemplate,
}: ActionTemplateDrawerProps) {
  const objectiveList = objectives.length > 0 ? objectives : DEFAULT_OBJECTIVES;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={selectedTemplate ? 'Edit Action Template' : 'New Action Template'}
      subtitle="Create a reusable action that you can quickly assign to stores."
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
            onClick={handleCreateTemplate}
            disabled={loading || !templateFormData.name || !templateFormData.default_unit}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : selectedTemplate ? (
              'Update Template'
            ) : (
              'Save Template'
            )}
          </BrandButton>
        </div>
      }
    >
      <form onSubmit={handleCreateTemplate} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-alert rounded-xl border border-red-200 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Category Toggle */}
          <div>
            <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
              Category
            </label>
            <div className="flex gap-2 p-1 bg-canvas border border-utility rounded-xl">
              <button
                type="button"
                onClick={() => {
                  const match = objectiveList.find((o) => o.category === 'COMMERCIAL');
                  setTemplateFormData((prev) => ({
                    ...prev,
                    category: 'COMMERCIAL',
                    objective: match ? match.name : 'THREAT_RESPONSE',
                  }));
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${
                  templateFormData.category === 'COMMERCIAL'
                    ? 'bg-deep text-white shadow-sm'
                    : 'text-slate hover:text-deep'
                }`}
              >
                Commercial
              </button>
              <button
                type="button"
                onClick={() => {
                  const match = objectiveList.find((o) => o.category === 'MARKETING');
                  setTemplateFormData((prev) => ({
                    ...prev,
                    category: 'MARKETING',
                    objective: match ? match.name : 'SHARE_OF_SHELF',
                  }));
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${
                  templateFormData.category === 'MARKETING'
                    ? 'bg-deep text-white shadow-sm'
                    : 'text-slate hover:text-deep'
                }`}
              >
                Marketing
              </button>
            </div>
          </div>

          {/* Action Type + UOM row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Task Objective
              </label>
              <select
                required
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
                value={templateFormData.objective}
                onChange={(e) => setTemplateFormData({ ...templateFormData, objective: e.target.value })}
              >
                {objectiveList
                  .filter((o) => o.category === templateFormData.category)
                  .map((o) => (
                    <option key={o.name} value={o.name}>
                      {objectiveMap[o.name] || o.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Metric Unit (UOM)
              </label>
              <input
                required
                type="text"
                placeholder="e.g. units, boxes, displays"
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep outline-none focus:border-deep text-sm"
                value={templateFormData.default_unit}
                onChange={(e) => setTemplateFormData({ ...templateFormData, default_unit: e.target.value })}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
              Main Action (Title)
            </label>
            <input
              required
              type="text"
              maxLength={50}
              placeholder="e.g. Permanent Asset Deployment"
              className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep outline-none focus:border-deep text-sm"
              value={templateFormData.name}
              onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
              Description / Guidelines
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Deploy branded merchandising asset tied to exclusivity terms..."
              className="w-full p-3.5 bg-canvas border border-utility rounded-xl outline-none focus:border-deep font-medium text-deep resize-none text-sm leading-relaxed"
              value={templateFormData.description}
              onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
            />
          </div>

          {/* Metric Goal + Impact Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Default Metric Goal {templateFormData.default_unit ? `(${templateFormData.default_unit})` : ''}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={templateFormData.default_unit ? `Target in ${templateFormData.default_unit}` : 'e.g. 150'}
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-mono text-deep focus:border-deep outline-none"
                value={templateFormData.target_value}
                onChange={(e) => setTemplateFormData({ ...templateFormData, target_value: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate uppercase tracking-wider block ml-1 mb-2">
                Impact Level
              </label>
              <select
                className="w-full p-3.5 bg-canvas border border-utility rounded-xl font-medium text-deep focus:border-deep outline-none"
                value={templateFormData.impact_level}
                onChange={(e) => setTemplateFormData({ ...templateFormData, impact_level: e.target.value })}
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
