'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import Drawer from './Drawer';
import { 
  MessageSquare, 
  TrendingUp, 
  AlertCircle, 
  Target,
  Loader2,
  CheckCircle,
  Tag,
  Mic
} from 'lucide-react';

interface FieldNoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  token: string | null;
}

export default function FieldNoteDrawer({ isOpen, onClose, storeId, token }: FieldNoteDrawerProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    note: '',
    note_type: 'general',
    risks: '',
    opportunities: '',
    is_actionable: false,
    execution_level: 'medium',
    // Competitor mini-flow
    competitor_name: '',
    competitor_presence: 'low'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Save the Note
      await apiClient.post<any>(`/trade/stores/${storeId}/notes`, {
        note: formData.note,
        note_type: formData.note_type,
        risks: formData.risks || null,
        opportunities: formData.opportunities || null,
        is_actionable: formData.is_actionable,
        execution_level: formData.execution_level
      });

      // 2. Optional: Save Competitor if provided
      if (formData.competitor_name) {
        await apiClient.post<any>('/trade/competitors', {
          store_id: storeId,
          name: formData.competitor_name,
          presence_level: formData.competitor_presence,
          notes: `Auto-generated from visit note: ${formData.note}`
        });
      }

      queryClient.invalidateQueries({ queryKey: ['store', storeId] });
      queryClient.invalidateQueries({ queryKey: ['competitors', storeId] });
      onClose();
      // Reset form
      setFormData({
        note: '',
        note_type: 'general',
        risks: '',
        opportunities: '',
        is_actionable: false,
        execution_level: 'medium',
        competitor_name: '',
        competitor_presence: 'low'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-4">
      <button 
        onClick={onClose}
        className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
      >
        Cancel
      </button>
      <button 
        onClick={handleSubmit}
        disabled={loading || !formData.note}
        className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Observation'}
      </button>
    </div>
  );

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Field Observation" 
      subtitle="Log intelligence, risks, and competitor moves."
      footer={footer}
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Note Content */}
        <div className="space-y-3">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
            The Narrative
          </label>
          <textarea 
            required
            rows={4}
            placeholder="What did you see at the store today? e.g. 'Stock levels are low, manager mentioned a competitor promo...'"
            className="w-full p-6 bg-gray-50 border-none rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-900 resize-none text-lg"
            value={formData.note}
            onChange={e => setFormData({...formData, note: e.target.value})}
          />
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Category
            </label>
            <select 
              className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-indigo-500"
              value={formData.note_type}
              onChange={e => setFormData({...formData, note_type: e.target.value})}
            >
              <option value="general">General Observation</option>
              <option value="commercial">Commercial / Sales</option>
              <option value="marketing">Marketing / POS</option>
              <option value="threat">Competitive Threat</option>
              <option value="opportunity">Expansion Opp</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Execution Level
            </label>
            <select 
              className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-indigo-500"
              value={formData.execution_level}
              onChange={e => setFormData({...formData, execution_level: e.target.value})}
            >
              <option value="high">High Execution</option>
              <option value="medium">Medium Execution</option>
              <option value="low">Low Execution</option>
            </select>
          </div>
        </div>

        {/* Extra Intelligence */}
        <div className="p-6 bg-gray-50 rounded-[2rem] space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={16} className="text-indigo-500" />
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Surgical Extraction</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                <AlertCircle size={14} /> Risks Identified
              </div>
              <input 
                type="text"
                placeholder="e.g. Near-expiry stock, Churn signal"
                className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                value={formData.risks}
                onChange={e => setFormData({...formData, risks: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                <TrendingUp size={14} /> Opportunities
              </div>
              <input 
                type="text"
                placeholder="e.g. Cross-sell candidate, Shelf expansion"
                className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                value={formData.opportunities}
                onChange={e => setFormData({...formData, opportunities: e.target.value})}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group pt-2">
            <input 
              type="checkbox"
              checked={formData.is_actionable}
              onChange={e => setFormData({...formData, is_actionable: e.target.checked})}
              className="w-6 h-6 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 transition-all"
            />
            <div>
              <p className="text-sm font-black text-gray-900">Mark as Actionable</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Flags this for immediate manager follow-up</p>
            </div>
          </label>
        </div>

        {/* Competitor Mini-Flow */}
        <div className="p-6 bg-red-50/30 rounded-[2rem] border border-red-50 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-red-500" />
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Competitor Activity</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rival Name</label>
              <input 
                type="text"
                placeholder="e.g. Brand X"
                className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold"
                value={formData.competitor_name}
                onChange={e => setFormData({...formData, competitor_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Presence</label>
              <select 
                className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-red-500 text-sm"
                value={formData.competitor_presence}
                onChange={e => setFormData({...formData, competitor_presence: e.target.value})}
              >
                <option value="low">Low / Not Visible</option>
                <option value="medium">Medium / Side-by-side</option>
                <option value="high">High / Dominant</option>
              </select>
            </div>
          </div>
        </div>

        {/* Future Voice Provenance Mockup */}
        <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 opacity-60">
          <div className="flex items-center gap-3">
            <Mic size={18} className="text-indigo-400" />
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Future Feature: Voice to Note</span>
          </div>
          <div className="w-12 h-1 bg-indigo-200 rounded-full animate-pulse" />
        </div>
      </div>
    </Drawer>
  );
}
