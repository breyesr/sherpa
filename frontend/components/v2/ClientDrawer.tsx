'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle, Store, ClipboardList, ShoppingCart, ChevronRight, Sparkles, BrainCircuit, Loader2, UserCircle, Calendar, Users, Plus, X, Settings } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import SafeDate from '../SafeDate';
import { components } from '@/types/api';

type ClientResponse = components['schemas']['ClientResponse'];
type BusinessProfileResponse = components['schemas']['BusinessProfileResponse'];
import Drawer from './Drawer';
import ManageFieldsDrawer from './ManageFieldsDrawer';

interface ClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  client?: ClientResponse | null; // If provided, we are in edit mode
  business: BusinessProfileResponse;
}

export default function ClientDrawer({ isOpen, onClose, onSuccess, token, client, business }: ClientDrawerProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'trade'
  const [isManageFieldsOpen, setIsManageFieldsOpen] = useState(false);

  // Custom Field Creation States
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'boolean' | 'date' | 'dropdown' | 'textarea' | 'multiselect'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [isSavingNewField, setIsSavingNewField] = useState(false);
  const [newFieldErr, setNewFieldErr] = useState('');

  // AI Report States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const isTrade = business?.vertical_type === 'TRADE';

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setName(client.name || '');
        setPhone(client.phone || '');
        setEmail(client.email || '');
        setRole(client.role || '');
        setBirthday(client.birthday || '');
        setGender(client.gender || '');
        setCustomFields((client.custom_fields as Record<string, any>) || {});
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setRole('');
        setBirthday('');
        setGender('');
        setCustomFields({});
      }
      setActiveTab('info');
      setAiReport(null);
      setError('');
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
      setNewFieldErr('');
    }
  }, [client, isOpen]);

  // Fetch Trade Context
  const { data: tradeContext, isLoading: loadingTrade } = useQuery({
    queryKey: ['client-trade-detail', client?.id],
    queryFn: async () => {
      if (!client) return null;
      const res = await fetch(`${API_BASE_URL}/crm/clients/${client.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch client trade context');
      return res.json();
    },
    enabled: !!client?.id && !!token && activeTab === 'trade' && isTrade,
  });

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveNewField = async () => {
    if (!newFieldName.trim()) {
      setNewFieldErr('Field name is required');
      return;
    }
    const cleanKey = newFieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_');
    if (!cleanKey || cleanKey === '_') {
      setNewFieldErr('Invalid field name');
      return;
    }

    const existingConfig = business?.crm_config || [];
    const isDuplicate = existingConfig.some((f: any) => f.key === cleanKey);
    if (isDuplicate) {
      setNewFieldErr(`A field with key "${cleanKey}" already exists`);
      return;
    }

    setIsSavingNewField(true);
    setNewFieldErr('');

    const newField: any = {
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

    const newCrmConfig = [...existingConfig, newField];

    try {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ crm_config: newCrmConfig })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Failed to save field configuration' }));
        throw new Error(errorData.detail || 'Failed to save field configuration');
      }

      // Success
      await queryClient.invalidateQueries({ queryKey: ['business'] });
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
    } catch (err: any) {
      setNewFieldErr(err.message);
    } finally {
      setIsSavingNewField(false);
    }
  };

  const handleGenerateReport = async (roleType: 'briefer' | 'qualifier') => {
    if (!client) return;
    setGeneratingReport(true);
    setAiReport(null);
    try {
      const res = await fetch(`${API_BASE_URL}/trade/clients/${client.id}/${roleType}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate AI report');
      const data = await res.json();
      setAiReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = client 
        ? `${API_BASE_URL}/crm/clients/${client.id}`
        : `${API_BASE_URL}/crm/clients`;
      
      const method = client ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          phone, 
          email, 
          role,
          birthday: birthday || null,
          gender,
          custom_fields: customFields 
        })
      });

      if (!res.ok) throw new Error(`Failed to ${client ? 'update' : 'create'} client`);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async () => {
    if (!client) return;
    setResolving(true);
    setError('');

    try {
      const updatedFields = { ...client.custom_fields, needs_review: false };
      const res = await fetch(`${API_BASE_URL}/crm/clients/${client.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ custom_fields: updatedFields })
      });

      if (!res.ok) throw new Error('Failed to resolve alert');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async () => {
    if (!client || !confirm(`Are you sure you want to delete ${client.name}?`)) return;
    
    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/crm/clients/${client.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete client');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const footer = (
    <div className="flex flex-col gap-3">
      {activeTab === 'info' && (
        <button 
          form="client-form"
          type="submit"
          disabled={loading || deleting}
          className="w-full bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : client ? 'Update Client' : 'Create Client'}
        </button>
      )}
      
      {client && (
        <button 
          type="button"
          disabled={loading || deleting}
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-2xl transition-all active:scale-95 disabled:opacity-50 font-sans"
        >
          {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
          {deleting ? 'Deleting...' : 'Delete Client'}
        </button>
      )}
    </div>
  );

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Client Profile' : 'Add New Client'}
      subtitle={client ? `Manage profile details for ${name || 'client'}` : 'Create a new customer profile'}
      footer={footer}
      size={activeTab === 'trade' ? 'wide' : 'standard'}
    >
      <div className="space-y-6">
        {/* Navigation Tabs (Only if client exists and is Trade) */}
        {client && isTrade && (
          <div className="flex items-center gap-6 border-b border-gray-100 pb-3">
            <button 
              onClick={() => setActiveTab('info')}
              className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'info' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
            >
              Information
            </button>
            <button 
              onClick={() => setActiveTab('trade')}
              className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'trade' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
            >
              Trade Context
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
            {(client?.custom_fields as any)?.needs_review && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800">Review Requested by AI</p>
                  <p className="text-xs text-red-600 mt-1">
                    Reason: {(client?.custom_fields as any)?.review_reason || 'Manual intervention needed'}
                  </p>
                  <button
                    type="button"
                    onClick={handleResolveAlert}
                    disabled={resolving}
                    className="mt-3 flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-all shadow-sm"
                  >
                    {resolving ? 'Resolving...' : (
                      <>
                        <CheckCircle size={14} />
                        Mark as Resolved
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name *</label>
              <input 
                required
                type="text" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number *</label>
              <input 
                required
                type="tel" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="+1 234 567 890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Email (Optional)</label>
              <input 
                type="email" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* B2B / Personal Details Section */}
            <div className="pt-4 space-y-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                {isTrade ? "B2B Details" : "Personal Details"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isTrade && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Job Role</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all pl-10 text-sm font-medium"
                        placeholder="e.g. Owner, Manager"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      />
                      <UserCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Birthday</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all pl-10 text-sm font-medium"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                    />
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Gender</label>
                  <div className="relative">
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all pl-10 appearance-none text-sm font-medium"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
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
                    Add Field
                  </button>
                )}
              </div>

              {/* Inline Form to add a new custom field */}
              {isAddingField && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Custom Field</h4>
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
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Field Name</label>
                      <input 
                        type="text"
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-medium"
                        placeholder="e.g. Pet Name"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Field Type</label>
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
                          Save Field
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {business?.crm_config && business.crm_config.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {business.crm_config.map((field: any) => (
                    <div key={field.key} className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">{field.label}</label>
                      {field.type === 'boolean' ? (
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={!!customFields[field.key]}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                            className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                          />
                          <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Enabled</span>
                        </label>
                      ) : field.type === 'date' ? (
                        <input 
                          type="date"
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                          value={customFields[field.key] || ''}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        />
                      ) : field.type === 'textarea' ? (
                        <textarea 
                          rows={3}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm resize-none"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          value={customFields[field.key] || ''}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        />
                      ) : field.type === 'dropdown' ? (
                        <select 
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm appearance-none"
                          value={customFields[field.key] || ''}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'multiselect' ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {field.options?.map((opt: string) => {
                            const currentSelection = Array.isArray(customFields[field.key]) ? customFields[field.key] : [];
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
                                    handleCustomFieldChange(field.key, newArr);
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
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          value={customFields[field.key] || ''}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No custom fields defined yet.</p>
              )}
              
              <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageFieldsOpen(true)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <Settings size={14} />
                  Manage Fields
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {loadingTrade ? (
              <div className="py-20 text-center animate-pulse text-gray-400 font-bold text-sm">Loading trade context...</div>
            ) : (
              <>
                {/* Stores */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Store size={14} className="text-blue-500" />
                    Linked Stores ({tradeContext?.stores?.length || 0})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tradeContext?.stores?.map((store: any) => (
                      <Link 
                        key={store.id} 
                        href={`/trade/stores/${store.id}`}
                        className="p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{store.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{store.address}</p>
                          </div>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                        </div>
                      </Link>
                    ))}
                    {(!tradeContext?.stores || tradeContext.stores.length === 0) && (
                      <p className="text-xs text-gray-400 italic">No stores linked to this client.</p>
                    )}
                  </div>
                </div>

                {/* Orders */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ShoppingCart size={14} className="text-emerald-500" />
                    Recent Orders ({tradeContext?.orders?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {tradeContext?.orders?.map((order: any) => (
                      <div key={order.id} className="p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                            <ShoppingCart size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">${order.total_amount.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                              <SafeDate date={order.created_at} />
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {order.status}
                        </span>
                      </div>
                    ))}
                    {(!tradeContext?.orders || tradeContext.orders.length === 0) && (
                      <p className="text-xs text-gray-400 italic">No orders found.</p>
                    )}
                  </div>
                </div>

                {/* Trade Notes */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardList size={14} className="text-amber-500" />
                    Customer Context ({tradeContext?.trade_notes?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {tradeContext?.trade_notes?.map((note: any) => (
                      <div key={note.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex gap-2">
                            {note.comm_style && <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-100 text-amber-700">{note.comm_style}</span>}
                            {note.visit_frequency && <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-100 text-amber-700">{note.visit_frequency}</span>}
                          </div>
                          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                            <SafeDate date={note.created_at} />
                          </span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">{note.general_notes}</p>
                      </div>
                    ))}
                    {(!tradeContext?.trade_notes || tradeContext.trade_notes.length === 0) && (
                      <p className="text-xs text-gray-400 italic">No specialized trade notes found.</p>
                    )}
                  </div>
                </div>

                {/* AI STRATEGIC INSIGHTS */}
                <div className="pt-6 border-t border-gray-100 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={14} />
                      AI Strategic Insights
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleGenerateReport('briefer')}
                      disabled={generatingReport}
                      className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold text-sm hover:bg-blue-100 transition-all border border-blue-100 disabled:opacity-50"
                    >
                      <BrainCircuit size={18} />
                      Visit Brief
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateReport('qualifier')}
                      disabled={generatingReport}
                      className="flex items-center justify-center gap-2 p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100 disabled:opacity-50"
                    >
                      <Sparkles size={18} />
                      Qualify Lead
                    </button>
                  </div>

                  {generatingReport && (
                    <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 animate-pulse">
                      <Loader2 className="animate-spin mx-auto mb-2 text-blue-500" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Analyzing retailer data...</p>
                    </div>
                  )}

                  {aiReport && !generatingReport && (
                    <div className="bg-gray-900 text-gray-100 p-6 rounded-[2rem] text-sm leading-relaxed relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={80} />
                      </div>
                      <div className="relative z-10 whitespace-pre-wrap font-medium">
                        {aiReport}
                      </div>
                      <button 
                        type="button"
                        onClick={() => setAiReport(null)}
                        className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                      >
                        Clear Analysis
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Drawer>
    
    <ManageFieldsDrawer
      isOpen={isManageFieldsOpen}
      onClose={() => setIsManageFieldsOpen(false)}
      business={business}
      token={token}
    />
    </>
  );
}
