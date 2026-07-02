'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  Settings, 
  User, 
  Calendar, 
  TrendingUp, 
  ListTodo, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Loader2, 
  AlertCircle,
  FileText,
  DollarSign,
  Activity,
  Layers,
  ChevronRight,
  UserCheck,
  Award
} from 'lucide-react';
import { StoreActionResponse, ActionTemplateResponse, StoreResponse } from '@/types/api';
import Drawer from '@/components/v2/Drawer';

export default function ActionsStrategyDesk() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  
  // Navigation / Tab states
  const [activeView, setActiveView] = useState<'desk' | 'catalog'>('desk');
  const [deskStatusFilter, setDeskStatusFilter] = useState<string>('pending'); // default show active pending tasks

  // Drawer / Form states
  const [isActionFormOpen, setIsActionFormOpen] = useState(false);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  
  const [selectedAction, setSelectedAction] = useState<StoreActionResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ActionTemplateResponse | null>(null);

  // Form Submissions states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch Current User (for authorization / default assignment checks)
  const { data: currentUser } = useQuery<any>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  const isAdmin = currentUser?.is_admin || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Fetch Teammates (Admins only)
  const { data: teammates = [] } = useQuery<any[]>({
    queryKey: ['teammates'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && isAdmin,
  });


  // Fetch Actions
  const { data: actions = [], isLoading: loadingActions } = useQuery<StoreActionResponse[]>({
    queryKey: ['actions'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/actions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch actions');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Action Templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<ActionTemplateResponse[]>({
    queryKey: ['action-templates'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/action-templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Store Action Objectives
  const { data: objectives = [] } = useQuery<any[]>({
    queryKey: ['store-action-objectives'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/objectives`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch objectives');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Accounts (Stores)
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  // -------------------------------------------------------------
  // FORM BINDINGS
  // -------------------------------------------------------------
  
  // Create Store Action State
  const [actionFormData, setActionFormData] = useState({
    store_id: '',
    template_id: '',
    category: 'COMMERCIAL' as 'COMMERCIAL' | 'MARKETING',
    objective: 'THREAT_RESPONSE',
    assigned_to_id: '',
    due_date: '',
    impact_level: 'MEDIUM',
    title: '',
    description: '',
    result_unit: '',
    target_value: '',
    details: {} as Record<string, any>
  });

  // Assignees are store contacts (Clients)
  const assigneesList = useMemo(() => {
    const selectedStore = stores.find(s => s.id === actionFormData.store_id);
    return selectedStore?.clients || [];
  }, [stores, actionFormData.store_id]);

  // Resolution State (Strict completion requirements)
  const [resolutionData, setResolutionData] = useState({
    status: 'completed',
    resolution_notes: '',
    result_value: '',
    revenue_impact: ''
  });

  // Create Template State
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    category: 'COMMERCIAL',
    default_unit: '',
    description: ''
  });

  // Filter actions based on status select
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      if (deskStatusFilter === 'all') return true;
      return (action.status || '').toLowerCase() === deskStatusFilter.toLowerCase();
    });
  }, [actions, deskStatusFilter]);

  // Analytics
  const stats = useMemo(() => {
    const completed = actions.filter(a => a.status === 'completed');
    const totalRevenue = completed.reduce((sum, a) => sum + (Number(a.revenue_impact) || 0), 0);
    const pending = actions.filter(a => a.status === 'pending');

    return {
      completedCount: completed.length,
      revenueFulfillment: totalRevenue,
      pendingCount: pending.length
    };
  }, [actions]);

  // -------------------------------------------------------------
  // API SUBMIT HANDLERS
  // -------------------------------------------------------------

  const handleCategoryChange = (cat: 'COMMERCIAL' | 'MARKETING') => {
    const list = objectives.length > 0 ? objectives : [
      { name: "THREAT_RESPONSE", label: "THREAT_RESPONSE", category: "COMMERCIAL" },
      { name: "THREAT_RESPONSE", label: "THREAT_RESPONSE", category: "MARKETING" },
      { name: "SHARE_OF_SHELF", label: "Share of Shelf", category: "MARKETING" },
      { name: "NEW_PRODUCT_INTRODUCTION", label: "new product introduction", category: "COMMERCIAL" },
      { name: "NEW_PRODUCT_INTRODUCTION", label: "new product introduction", category: "MARKETING" },
      { name: "INVENTORY_VELOCITY_OOS_PREVENTION", label: "Inventory Velocity & OOS Prevention", category: "COMMERCIAL" },
      { name: "PERFECT_STORE_ASSORTMENT_COMPLIANCE", label: '"Perfect Store" & Assortment Compliance', category: "COMMERCIAL" },
      { name: "PERFECT_STORE_ASSORTMENT_COMPLIANCE", label: '"Perfect Store" & Assortment Compliance', category: "MARKETING" },
      { name: "SEASONAL_EVENT_ACTIVATION", label: "Seasonal & Event Activation", category: "MARKETING" },
      { name: "TRADE_LOYALTY_VOLUME_PUSHING", label: "Trade Loyalty & Volume Pushing (Sell-In)", category: "COMMERCIAL" },
      { name: "POSM_MAINTENANCE_ASSET_PURITY", label: "POSM Maintenance & Asset Purity", category: "MARKETING" }
    ];
    const match = list.find(o => o.category === cat);
    setActionFormData(prev => ({
      ...prev,
      category: cat,
      objective: match ? match.name : ''
    }));
  };

  const handleTemplateChange = (tplId: string) => {
    const selectedTpl = templates.find(t => t.id === tplId);
    if (selectedTpl) {
      setActionFormData(prev => ({
        ...prev,
        template_id: tplId,
        category: selectedTpl.category as 'COMMERCIAL' | 'MARKETING',
        result_unit: selectedTpl.default_unit,
        title: selectedTpl.name,
        description: selectedTpl.description || ''
      }));
    } else {
      setActionFormData(prev => ({
        ...prev,
        template_id: '',
      }));
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Front-end percentage validation for SHARE_OF_SHELF
    if (actionFormData.objective === 'SHARE_OF_SHELF' && actionFormData.target_value) {
      const val = parseFloat(actionFormData.target_value);
      if (isNaN(val) || val < 1 || val > 100) {
        setError('Goal percentage must be between 1 and 100');
        setLoading(false);
        return;
      }
    }

    const targetValFloat = actionFormData.target_value ? parseFloat(actionFormData.target_value) : null;
    const postPayload = {
      store_id: actionFormData.store_id,
      template_id: actionFormData.template_id || null,
      category: actionFormData.category,
      objective: actionFormData.objective,
      assigned_to_id: actionFormData.assigned_to_id || null,
      due_date: actionFormData.due_date ? new Date(actionFormData.due_date).toISOString() : null,
      status: 'pending',
      impact_level: actionFormData.impact_level,
      result_unit: actionFormData.result_unit || 'unit',
      details: {
        title: actionFormData.title,
        description: actionFormData.description,
        target_value: targetValFloat,
        ...actionFormData.details
      }
    };

    try {
      const res = await fetch(`${API_BASE_URL}/trade/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postPayload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create action');
      }

      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setIsActionFormOpen(false);
      setActionFormData({
        store_id: '',
        template_id: '',
        category: 'COMMERCIAL',
        objective: 'THREAT_RESPONSE',
        assigned_to_id: '',
        due_date: '',
        impact_level: 'MEDIUM',
        title: '',
        description: '',
        result_unit: '',
        target_value: '',
        details: {}
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;

    setLoading(true);
    setError('');

    // Client side strict validations
    if (resolutionData.status === 'completed') {
      if (resolutionData.result_value === '' || !resolutionData.resolution_notes.trim()) {
        setError('Completion Validation Error: Numeric result value and resolution notes are required.');
        setLoading(false);
        return;
      }
    }

    const patchPayload = {
      status: resolutionData.status,
      resolution_notes: resolutionData.status === 'completed' ? resolutionData.resolution_notes : null,
      result_value: resolutionData.status === 'completed' ? Number(resolutionData.result_value) : null,
      revenue_impact: resolutionData.status === 'completed' && resolutionData.revenue_impact ? Number(resolutionData.revenue_impact) : null
    };

    try {
      const res = await fetch(`${API_BASE_URL}/trade/actions/${selectedAction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(patchPayload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to resolve action');
      }

      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setIsResolutionOpen(false);
      setSelectedAction(null);
      setResolutionData({
        status: 'completed',
        resolution_notes: '',
        result_value: '',
        revenue_impact: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = selectedTemplate 
        ? `${API_BASE_URL}/trade/action-templates/${selectedTemplate.id}`
        : `${API_BASE_URL}/trade/action-templates`;
      const method = selectedTemplate ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateFormData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to save template');
      }

      queryClient.invalidateQueries({ queryKey: ['action-templates'] });
      setIsTemplateFormOpen(false);
      setSelectedTemplate(null);
      setTemplateFormData({
        name: '',
        category: 'COMMERCIAL',
        default_unit: '',
        description: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this action template?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/trade/action-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete template');
      queryClient.invalidateQueries({ queryKey: ['action-templates'] });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Pre-seed form for resolution
  const openResolutionDrawer = (action: StoreActionResponse) => {
    setSelectedAction(action);
    setResolutionData({
      status: action.status === 'proposed' ? 'pending' : 'completed',
      resolution_notes: action.resolution_notes || '',
      result_value: action.result_value !== null ? action.result_value.toString() : '',
      revenue_impact: action.revenue_impact !== null ? action.revenue_impact.toString() : ''
    });
    setIsResolutionOpen(true);
  };

  // Pre-seed form for template editing
  const openTemplateEdit = (tpl: ActionTemplateResponse) => {
    setSelectedTemplate(tpl);
    setTemplateFormData({
      name: tpl.name,
      category: tpl.category,
      default_unit: tpl.default_unit,
      description: tpl.description || ''
    });
    setIsTemplateFormOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'proposed':
        return { label: 'Proposed', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: Clock };
      case 'pending':
        return { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock };
      case 'completed':
        return { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-100', icon: XCircle };
      default:
        return { label: 'Unknown', color: 'bg-gray-50 text-gray-700 border-gray-100', icon: Clock };
    }
  };

  const defaultObjectiveMap: Record<string, string> = {
    THREAT_RESPONSE: 'THREAT_RESPONSE',
    SHARE_OF_SHELF: 'Share of Shelf',
    NEW_PRODUCT_INTRODUCTION: 'new product introduction',
    INVENTORY_VELOCITY_OOS_PREVENTION: 'Inventory Velocity & OOS Prevention',
    PERFECT_STORE_ASSORTMENT_COMPLIANCE: '"Perfect Store" & Assortment Compliance',
    SEASONAL_EVENT_ACTIVATION: 'Seasonal & Event Activation',
    TRADE_LOYALTY_VOLUME_PUSHING: 'Trade Loyalty & Volume Pushing (Sell-In)',
    POSM_MAINTENANCE_ASSET_PURITY: 'POSM Maintenance & Asset Purity'
  };

  const objectiveMap = {
    ...defaultObjectiveMap,
    ...objectives.reduce((acc: Record<string, string>, obj: any) => {
      acc[obj.name] = obj.label;
      return acc;
    }, {})
  };

  const filteredObjectives = useMemo(() => {
    const activeList = objectives.length > 0 ? objectives : [
      { name: "THREAT_RESPONSE", label: "THREAT_RESPONSE", category: "COMMERCIAL" },
      { name: "THREAT_RESPONSE", label: "THREAT_RESPONSE", category: "MARKETING" },
      { name: "SHARE_OF_SHELF", label: "Share of Shelf", category: "MARKETING" },
      { name: "NEW_PRODUCT_INTRODUCTION", label: "new product introduction", category: "COMMERCIAL" },
      { name: "NEW_PRODUCT_INTRODUCTION", label: "new product introduction", category: "MARKETING" },
      { name: "INVENTORY_VELOCITY_OOS_PREVENTION", label: "Inventory Velocity & OOS Prevention", category: "COMMERCIAL" },
      { name: "PERFECT_STORE_ASSORTMENT_COMPLIANCE", label: '"Perfect Store" & Assortment Compliance', category: "COMMERCIAL" },
      { name: "PERFECT_STORE_ASSORTMENT_COMPLIANCE", label: '"Perfect Store" & Assortment Compliance', category: "MARKETING" },
      { name: "SEASONAL_EVENT_ACTIVATION", label: "Seasonal & Event Activation", category: "MARKETING" },
      { name: "TRADE_LOYALTY_VOLUME_PUSHING", label: "Trade Loyalty & Volume Pushing (Sell-In)", category: "COMMERCIAL" },
      { name: "POSM_MAINTENANCE_ASSET_PURITY", label: "POSM Maintenance & Asset Purity", category: "MARKETING" }
    ];
    return activeList.filter((o: any) => o.category === actionFormData.category);
  }, [objectives, actionFormData.category]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header and Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            Strategy Desk
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg max-w-2xl">
            Promote proposed insights, assign reps, track due dates, and enforce elastic execution results.
          </p>
        </div>
        
        {/* Top Level Action Buttons */}
        <div className="flex gap-4 shrink-0">
          <div className="p-1 bg-gray-100 rounded-2xl flex">
            <button
              onClick={() => setActiveView('desk')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeView === 'desk' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Strategy Desk
            </button>
            <button
              onClick={() => setActiveView('catalog')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeView === 'catalog' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Action Catalog
            </button>
          </div>
          
          {activeView === 'desk' ? (
            <button 
              onClick={() => setIsActionFormOpen(true)}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-sm font-bold shadow-xl hover:bg-black transition-all active:scale-95"
            >
              <Plus size={16} />
              Create Action
            </button>
          ) : (
            <button 
              onClick={() => {
                setSelectedTemplate(null);
                setTemplateFormData({ name: '', category: 'COMMERCIAL', default_unit: '', description: '' });
                setIsTemplateFormOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl text-sm font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Plus size={16} />
              Create Template
            </button>
          )}
        </div>
      </div>

      {/* Analytics Summary */}
      {activeView === 'desk' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <DollarSign size={28} />
            </div>
            <div>
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Action Revenue</span>
              <h3 className="text-3xl font-black text-gray-900 mt-1">${stats.revenueFulfillment.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Award size={28} />
            </div>
            <div>
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Completed Actions</span>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.completedCount}</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <ListTodo size={28} />
            </div>
            <div>
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Active Pending Desk</span>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.pendingCount}</h3>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: STRATEGY DESK */}
      {activeView === 'desk' && (
        <div className="space-y-6">
          
          {/* Status Tabs Control */}
          <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex flex-wrap p-1 bg-gray-50 rounded-2xl">
              {['pending', 'proposed', 'completed', 'cancelled', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setDeskStatusFilter(status)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    deskStatusFilter === status 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <span className="text-xs bg-gray-50 border border-gray-100 text-gray-500 font-bold px-4 py-2 rounded-full hidden md:inline-block">
              {filteredActions.length} Actions matching
            </span>
          </div>

          {/* Directory Content */}
          {loadingActions ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
              <span className="font-bold text-gray-500">Loading Strategy Desk...</span>
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2rem] flex items-center justify-center mb-6">
                <ListTodo size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Desk is empty</h3>
              <p className="text-gray-500 mt-2">No active operations match this status filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActions.map((action) => {
                const badge = getStatusBadge(action.status);
                const BadgeIcon = badge.icon;
                const objectiveLabel = objectiveMap[action.objective] || action.objective;
                
                return (
                  <div 
                    key={action.id}
                    onClick={() => openResolutionDrawer(action)}
                    className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Badge / Category Header */}
                      <div className="flex justify-between items-start mb-6">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider border ${badge.color}`}>
                          <BadgeIcon size={10} />
                          {badge.label}
                        </span>
                        
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider">
                          {action.category}
                        </span>
                      </div>

                      {/* Action Title & Store */}
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Action Title</span>
                      <h3 className="text-lg font-black text-gray-900 mt-0.5 truncate group-hover:text-blue-600 transition-colors">
                        {action.details?.title || action.template_name || 'Manual Audit'}
                      </h3>

                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mt-3">Account</span>
                      <p className="text-xs font-bold text-gray-600 mt-0.5 truncate">
                        {action.store_name || 'Unknown Account'}
                      </p>

                      {/* Action Specs */}
                      <div className="mt-4 space-y-2.5 pt-4 border-t border-gray-50">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-medium">Template</span>
                          <span className="font-bold text-gray-700 truncate max-w-[150px]">{action.template_name || 'Manual Audit'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-medium">Objective</span>
                          <span className="font-bold text-gray-700">{objectiveLabel}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-medium">Assignee</span>
                          <span className="font-bold text-gray-700 flex items-center gap-1">
                            <User size={12} className="text-gray-300" />
                            {action.assigned_to_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Result Reporting / Deadlines */}
                    <div className="mt-6 pt-5 border-t border-gray-50 flex items-center justify-between">
                      {action.status === 'completed' ? (
                        <div>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Result</span>
                          <span className="text-base font-black text-gray-900">
                            {action.result_value} <span className="text-2xs font-bold text-gray-400 uppercase">{action.result_unit || 'exchanges'}</span>
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Due Date</span>
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} className="text-gray-300" />
                            {action.due_date ? new Date(action.due_date).toLocaleDateString() : 'No Deadline'}
                          </span>
                        </div>
                      )}
                      
                      {action.status === 'completed' && action.revenue_impact && (
                        <div className="text-right">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Fulfillment</span>
                          <span className="text-sm font-black text-gray-900">${Number(action.revenue_impact).toFixed(2)}</span>
                        </div>
                      )}

                      {action.status !== 'completed' && (
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* VIEW: ACTION CATALOG */}
      {activeView === 'catalog' && (
        <div className="space-y-6">
          {loadingTemplates ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
              <span className="font-bold text-gray-500">Loading catalog templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2rem] flex items-center justify-center mb-6">
                <Settings size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Catalog is empty</h3>
              <p className="text-gray-500 mt-2">Define your business standard operational templates first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <div 
                  key={tpl.id}
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider">
                        {tpl.category}
                      </span>
                      <span className="text-xs text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 uppercase tracking-widest font-mono">
                        Unit: {tpl.default_unit}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-gray-900">{tpl.name}</h3>
                      {tpl.description && (
                        <p className="text-gray-500 text-sm mt-2 line-clamp-3 leading-relaxed font-medium">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-gray-50 flex justify-end gap-3">
                    <button
                      onClick={() => openTemplateEdit(tpl)}
                      className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 border border-gray-200 rounded-xl text-2xs font-bold transition-all"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="flex items-center gap-1 bg-white hover:bg-red-50 text-red-600 px-4 py-2 border border-red-100 rounded-xl text-2xs font-bold transition-all"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          DRAWER: CREATE MANUA STORE ACTION
      ------------------------------------------------------------- */}
      <Drawer
        isOpen={isActionFormOpen}
        onClose={() => setIsActionFormOpen(false)}
        title="Create Store Action"
        subtitle="Define tactical requirements for reps on site."
        size="wide"
        footer={
          <div className="flex gap-4">
            <button 
              onClick={() => setIsActionFormOpen(false)}
              className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateAction}
              disabled={loading || !actionFormData.store_id || !actionFormData.title || !actionFormData.result_unit || !actionFormData.target_value}
              className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Dispatch Action'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateAction} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Target Account Location</label>
              <select
                required
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={actionFormData.store_id}
                onChange={e => setActionFormData({...actionFormData, store_id: e.target.value, assigned_to_id: ''})}
              >
                <option value="">Select Account...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.region})</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Category</label>
              <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('COMMERCIAL')}
                  className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all ${
                    actionFormData.category === 'COMMERCIAL'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Commercial
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('MARKETING')}
                  className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all ${
                    actionFormData.category === 'MARKETING'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Marketing
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Catalog Action Template (Optional)</label>
              <select
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={actionFormData.template_id}
                onChange={e => handleTemplateChange(e.target.value)}
              >
                <option value="">No Template (Custom Action)...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Action Type (Objective)</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                  value={actionFormData.objective}
                  onChange={e => setActionFormData({...actionFormData, objective: e.target.value})}
                >
                  {filteredObjectives.map(o => <option key={o.name} value={o.name}>{objectiveMap[o.name] || o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Operational Rep (Assignee)</label>
                <select
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                  value={actionFormData.assigned_to_id}
                  onChange={e => setActionFormData({...actionFormData, assigned_to_id: e.target.value})}
                >
                  <option value="">Select Assigned Rep...</option>
                  {assigneesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.email ? `(${c.email})` : c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Main Action (Title)</label>
              <input
                required
                maxLength={50}
                placeholder="e.g. Despliegue de Activo Permanente"
                type="text"
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                value={actionFormData.title}
                onChange={e => setActionFormData({...actionFormData, title: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Description / Guidelines</label>
              <textarea
                rows={3}
                placeholder="e.g. Proveer un activo de la marca condicionado a un acuerdo de exclusividad..."
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                value={actionFormData.description}
                onChange={e => setActionFormData({...actionFormData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Metric Unit</label>
                <input
                  required
                  placeholder="e.g. sacos, frentes, exchanges"
                  type="text"
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={actionFormData.result_unit}
                  onChange={e => setActionFormData({...actionFormData, result_unit: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Metric Goal</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="e.g. 150"
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={actionFormData.target_value}
                  onChange={e => setActionFormData({...actionFormData, target_value: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Operational Deadline</label>
              <input
                type="date"
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                value={actionFormData.due_date}
                onChange={e => setActionFormData({...actionFormData, due_date: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Impact Level</label>
              <select
                required
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={actionFormData.impact_level}
                onChange={e => setActionFormData({...actionFormData, impact_level: e.target.value})}
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
          </div>
        </form>
      </Drawer>

      {/* -------------------------------------------------------------
          DRAWER: RESOLUTION & ACCOUNTABILITY OUTCOME PANEL
      ------------------------------------------------------------- */}
      <Drawer
        isOpen={isResolutionOpen}
        onClose={() => setIsResolutionOpen(false)}
        title="Tactical Action Detail"
        subtitle="Resolve strategies, input results, and fulfill account objectives."
        size="wide"
        footer={
          <div className="flex gap-4">
            <button 
              onClick={() => setIsResolutionOpen(false)}
              className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              onClick={handleResolveAction}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Desk Log'}
            </button>
          </div>
        }
      >
        {selectedAction && (
          <form onSubmit={handleResolveAction} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Quick action info */}
            <div className="p-6 bg-gray-50 rounded-[2rem] space-y-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black text-gray-900">{selectedAction.store_name || 'Target Account'}</h4>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-2xs font-bold uppercase">
                  {selectedAction.category}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-medium block">Objective</span>
                  <span className="font-bold text-gray-800">{objectiveMap[selectedAction.objective] || selectedAction.objective}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Template Specs</span>
                  <span className="font-bold text-gray-800">{selectedAction.template_name || 'Manual Ingestion'}</span>
                </div>
              </div>
            </div>

            {/* Custom Action details */}
            {(selectedAction.details?.title || selectedAction.details?.description || selectedAction.details?.target_value) && (
              <div className="p-6 bg-blue-50/30 rounded-[2rem] space-y-4 border border-blue-50/50">
                {selectedAction.details?.title && (
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Main Action</span>
                    <h4 className="text-base font-black text-gray-900 mt-0.5">{selectedAction.details.title}</h4>
                  </div>
                )}
                {selectedAction.details?.description && (
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Description / Guidelines</span>
                    <p className="text-sm font-semibold text-gray-700 mt-1 whitespace-pre-line">{selectedAction.details.description}</p>
                  </div>
                )}
                {selectedAction.details?.target_value && (
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Goal</span>
                    <span className="text-sm font-black text-gray-900 mt-0.5">
                      {selectedAction.details.target_value} <span className="text-2xs font-bold text-gray-400 uppercase">{selectedAction.result_unit || 'units'}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Status Select */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Execute Status</label>
              <select
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={resolutionData.status}
                onChange={e => setResolutionData({...resolutionData, status: e.target.value})}
              >
                <option value="pending">Pending Operational Sync</option>
                <option value="proposed">Proposed Draft Note</option>
                <option value="completed">Completed & Fulfill Specs</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Strict outcome validation conditional inputs */}
            {resolutionData.status === 'completed' && (
              <div className="p-6 bg-blue-50/50 rounded-[2rem] space-y-6 border border-blue-100/50 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2">
                  <UserCheck className="text-blue-600" size={18} />
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Execution Metrics (Required)</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest block ml-1 mb-2">
                      Result Value ({selectedAction.result_unit || 'exchanges'})
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5, 12.5"
                      className="w-full p-4 bg-white border border-blue-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                      value={resolutionData.result_value}
                      onChange={e => setResolutionData({...resolutionData, result_value: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest block ml-1 mb-2">
                      Revenue Impact ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Optional revenue gen"
                      className="w-full p-4 bg-white border border-blue-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                      value={resolutionData.revenue_impact}
                      onChange={e => setResolutionData({...resolutionData, revenue_impact: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest block ml-1 mb-2">Resolution Notes</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Rep logging details on execution outcome..."
                    className="w-full p-4 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 resize-none text-sm"
                    value={resolutionData.resolution_notes}
                    onChange={e => setResolutionData({...resolutionData, resolution_notes: e.target.value})}
                  />
                </div>
              </div>
            )}
          </form>
        )}
      </Drawer>

      {/* -------------------------------------------------------------
          DRAWER: CREATE / EDIT TEMPLATE CONFIGURATION
      ------------------------------------------------------------- */}
      <Drawer
        isOpen={isTemplateFormOpen}
        onClose={() => setIsTemplateFormOpen(false)}
        title={selectedTemplate ? "Edit Catalog Template" : "New Catalog Template"}
        subtitle="Configure action criteria category and metric UOM units."
        size="wide"
        footer={
          <div className="flex gap-4">
            <button 
              onClick={() => setIsTemplateFormOpen(false)}
              className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateTemplate}
              disabled={loading || !templateFormData.name || !templateFormData.default_unit}
              className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Template'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateTemplate} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Template Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Replenish Premium Arabica SKU"
                className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={templateFormData.name}
                onChange={e => setTemplateFormData({...templateFormData, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Category</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-indigo-500"
                  value={templateFormData.category}
                  onChange={e => setTemplateFormData({...templateFormData, category: e.target.value})}
                >
                  <option value="COMMERCIAL">Commercial (Sales)</option>
                  <option value="MARKETING">Marketing (Promo)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Default UOM Result Unit</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. exchanges, placements, interactions"
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={templateFormData.default_unit}
                  onChange={e => setTemplateFormData({...templateFormData, default_unit: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Instructions / Action Guidelines</label>
              <textarea
                rows={4}
                placeholder="Give reps background details on what actions to perform on site..."
                className="w-full p-4 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900 resize-none text-sm"
                value={templateFormData.description}
                onChange={e => setTemplateFormData({...templateFormData, description: e.target.value})}
              />
            </div>
          </div>
        </form>
      </Drawer>

    </div>
  );
}
