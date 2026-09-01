'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { components } from '@/types/api';
import { CatalogField } from '@/types/models';

type BusinessProfileResponse = components['schemas']['BusinessProfileResponse'];
import Drawer from './Drawer';

interface ManageCatalogAttributesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfileResponse | undefined;
  token: string | null;
}

export default function ManageCatalogAttributesDrawer({ isOpen, onClose, business, token }: ManageCatalogAttributesDrawerProps) {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<CatalogField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [fieldToDelete, setFieldToDelete] = useState<CatalogField | null>(null);

  useEffect(() => {
    if (isOpen && business) {
      const attributes = (business.catalog_config as unknown as CatalogField[]) || [];
      setFields(JSON.parse(JSON.stringify(attributes)));
      setError('');
      setFieldToDelete(null);
    }
  }, [isOpen, business]);

  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = [...fields];
    updated[index].label = newLabel;
    setFields(updated);
  };

  const handleSave = async () => {
    if (!business) return;
    setLoading(true);
    setError('');
    try {
      await apiClient.patch<any>('/business/me', { catalog_config: fields });
      
      await queryClient.invalidateQueries({ queryKey: ['business'] });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!fieldToDelete || !business) return;
    
    setLoading(true);
    setError('');
    try {
      const updatedFields = fields.filter(f => f.key !== fieldToDelete.key);
      
      await apiClient.patch<any>('/business/me', { catalog_config: updatedFields });
      
      await queryClient.invalidateQueries({ queryKey: ['business'] });
      setFields(updatedFields);
      setFieldToDelete(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting.');
    } finally {
      setLoading(false);
    }
  };

  const footerContent = (
    <div className="flex justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={loading || fields.length === 0}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        Save Changes
      </button>
    </div>
  );

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Manage Product Attributes" 
      subtitle="Update or delete custom specification fields for your catalog"
      size="standard"
      footer={footerContent}
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-500">
          Update the display labels of your custom product attributes or remove attributes you no longer need.
        </p>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No custom attributes exist.</p>
          ) : (
            fields.map((field, idx) => (
              <div key={field.key} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2 relative group">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                    Display Label
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                      value={field.label}
                      onChange={(e) => handleLabelChange(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setFieldToDelete(field)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete attribute"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {fieldToDelete && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Attribute?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove the attribute <span className="font-bold text-gray-900">{fieldToDelete.label}</span>? 
              Existing product values for this attribute will remain in the database, but will no longer appear in form editors.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFieldToDelete(null)}
                className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
