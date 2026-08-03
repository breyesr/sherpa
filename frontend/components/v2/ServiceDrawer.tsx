'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle, Plus, X, Settings, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { components } from '@/types/api';
import { CRMField } from '@/types/models';

type BusinessProfileResponse = components['schemas']['BusinessProfileResponse'];
import Drawer from './Drawer';
import ManageAttributesDrawer from './ManageAttributesDrawer';

type ServiceResponse = components['schemas']['ServiceResponse'];

interface ServiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  business: BusinessProfileResponse | undefined;
  service?: ServiceResponse | null;
}

export default function ServiceDrawer({ isOpen, onClose, onSuccess, token, business, service }: ServiceDrawerProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  
  const [isManageAttributesOpen, setIsManageAttributesOpen] = useState(false);

  // Custom Attribute States
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'boolean' | 'date' | 'dropdown' | 'textarea' | 'multiselect'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [isSavingNewField, setIsSavingNewField] = useState(false);
  const [newFieldErr, setNewFieldErr] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (service) {
        setName(service.name || '');
        setPrice(service.price || '');
        setDuration(service.duration_minutes || 60);
        setDescription(service.description || '');
        setAttributes((service.attributes as Record<string, any>) || {});
      } else {
        setName('');
        setPrice('');
        setDuration(60);
        setDescription('');
        setAttributes({});
      }
      setError('');
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
      setNewFieldErr('');
    }
  }, [isOpen, service]);

  const handleAttributeChange = (key: string, value: string | number | boolean | string[]) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveNewField = async () => {
    if (!business) return;
    if (!newFieldName.trim()) {
      setNewFieldErr('Field name is required');
      return;
    }
    const cleanKey = newFieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_');
    if (!cleanKey || cleanKey === '_') {
      setNewFieldErr('Invalid field name');
      return;
    }

    const featuresConfig = (business.features_config as any) || {};
    const existingAttributes = featuresConfig?.services?.attributes || [];
    const isDuplicate = existingAttributes.some((f: CRMField) => f.key === cleanKey);
    if (isDuplicate) {
      setNewFieldErr(`An attribute with key "${cleanKey}" already exists`);
      return;
    }

    setIsSavingNewField(true);
    setNewFieldErr('');

    const newField: CRMField = {
      key: cleanKey,
      label: newFieldName.trim(),
      type: newFieldType
    };

    if (newFieldType === 'dropdown' || newFieldType === 'multiselect') {
      const optionsArray = newFieldOptions.split(',').map(o => o.trim()).filter(Boolean);
      if (optionsArray.length === 0) {
        setNewFieldErr('Options are required for this field type');
        return;
      }
      newField.options = optionsArray;
    }

    const newAttributes = [...existingAttributes, newField];
    const newFeaturesConfig = {
      ...featuresConfig,
      services: {
        ...(featuresConfig.services || {}),
        attributes: newAttributes
      }
    };

    try {
      await apiClient.patch<any>('/business/me', { features_config: newFeaturesConfig });

      await queryClient.invalidateQueries({ queryKey: ['business'] });
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
    } catch (err: unknown) {
      setNewFieldErr(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSavingNewField(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const path = service 
        ? `/services/${service.id}`
        : `/services/`;
      
      const payload = { 
        name, 
        description, 
        duration_minutes: duration, 
        price,
        attributes 
      };

      if (service) {
        await apiClient.patch<any>(path, payload);
      } else {
        await apiClient.post<any>(path, payload);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!service || !confirm(`Are you sure you want to delete ${service.name}?`)) return;
    
    setDeleting(true);
    setError('');

    try {
      await apiClient.delete<any>(`/services/${service.id}`);

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  const footer = (
    <div className="flex flex-col gap-3">
      <button 
        form="service-form"
        type="submit"
        disabled={loading || deleting}
        className="w-full bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : service ? 'Update Service' : 'Create Service'}
      </button>
      
      {service && (
        <button 
          type="button"
          disabled={loading || deleting}
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-2xl transition-all active:scale-95 disabled:opacity-50 font-sans"
        >
          {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
          {deleting ? 'Deleting...' : 'Delete Service'}
        </button>
      )}
      
      <button 
        type="button"
        disabled={loading || deleting}
        onClick={onClose}
        className="w-full flex items-center justify-center gap-2 text-gray-500 font-bold py-3 hover:bg-gray-50 rounded-2xl transition-all active:scale-95 disabled:opacity-50 font-sans"
      >
        Cancel
      </button>
    </div>
  );

  const featuresConfig = (business?.features_config as any) || {};
  const businessAttributes = featuresConfig?.services?.attributes || [];

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={service ? 'Edit Service' : 'Add New Service'}
      subtitle={service ? `Manage details for ${name || 'service'}` : 'Create a new service catalog entry'}
      footer={footer}
      size="standard"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="service-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Service Name *</label>
            <input 
              required
              type="text" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
              placeholder="e.g. Premium Haircut"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Duration (Min) *</label>
              <input 
                required
                type="number" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Price</label>
              <input 
                type="text" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="25.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Description</label>
            <textarea 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium min-h-[80px]"
              placeholder="What is included in this service?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Dynamic Custom Fields */}
          <div className="pt-4 space-y-6 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Additional Information</h3>
              {!isAddingField && (
                <button
                  type="button"
                  onClick={() => setIsAddingField(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all px-3 py-1.5 rounded-xl hover:bg-blue-50 border border-dashed border-blue-200 hover:border-blue-300"
                >
                  <Plus size={14} />
                  Add Attribute
                </button>
              )}
            </div>

            {/* Inline Form to add a new custom field */}
            {isAddingField && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Custom Attribute</h4>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAddingField(false);
                      setNewFieldName('');
                      setNewFieldType('text');
                      setNewFieldOptions('');
                      setNewFieldErr('');
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                {newFieldErr && (
                  <div className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{newFieldErr}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attribute Name</label>
                    <input 
                      type="text"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-medium"
                      placeholder="e.g. Requires Washing"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attribute Type</label>
                    <select 
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-medium"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as any)}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Checkbox</option>
                      <option value="date">Date</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="textarea">Text Area</option>
                      <option value="multiselect">Multi-select</option>
                    </select>
                  </div>
                </div>

                {(newFieldType === 'dropdown' || newFieldType === 'multiselect') && (
                  <div className="space-y-1 mt-3">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Options (comma-separated)</label>
                    <input 
                      type="text"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-medium"
                      placeholder="e.g. Option 1, Option 2, Option 3"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingField(false);
                      setNewFieldName('');
                      setNewFieldType('text');
                      setNewFieldOptions('');
                      setNewFieldErr('');
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingNewField}
                    onClick={handleSaveNewField}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingNewField ? (
                      <>
                        <Loader2 className="animate-spin" size={12} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={12} />
                        Save Attribute
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {businessAttributes.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {businessAttributes.map((field: CRMField) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">{field.label}</label>
                    {field.type === 'boolean' ? (
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={!!attributes[field.key]}
                          onChange={(e) => handleAttributeChange(field.key, e.target.checked)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                        />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Enabled</span>
                      </label>
                    ) : field.type === 'date' ? (
                      <input 
                        type="date"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                        value={attributes[field.key] || ''}
                        onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      />
                    ) : field.type === 'textarea' ? (
                      <textarea 
                        rows={3}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm resize-none"
                        placeholder={`Enter ${field.label?.toLowerCase() || ''}`}
                        value={attributes[field.key] || ''}
                        onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      />
                    ) : field.type === 'dropdown' ? (
                      <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm appearance-none"
                        value={attributes[field.key] || ''}
                        onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'multiselect' ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {field.options?.map((opt: string) => {
                          const currentSelection = Array.isArray(attributes[field.key]) ? attributes[field.key] : [];
                          const isChecked = currentSelection.includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  let newArr = [...currentSelection];
                                  if (checked) {
                                    newArr.push(opt);
                                  } else {
                                    newArr = newArr.filter((val: string) => val !== opt);
                                  }
                                  handleAttributeChange(field.key, newArr);
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                              />
                              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <input 
                        type={field.type === 'number' ? 'number' : 'text'} 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                        placeholder={`Enter ${field.label?.toLowerCase() || ''}`}
                        value={attributes[field.key] || ''}
                        onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No custom attributes defined yet.</p>
            )}
            
            <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageAttributesOpen(true)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Settings size={14} />
                Manage Attributes
              </button>
            </div>
          </div>
        </form>
      </div>
    </Drawer>

    <ManageAttributesDrawer
      isOpen={isManageAttributesOpen}
      onClose={() => setIsManageAttributesOpen(false)}
      business={business}
      token={token}
    />
    </>
  );
}
