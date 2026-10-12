'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  Settings, 
  User, 
  Calendar, 
  ListTodo, 
  Edit3, 
  Trash2, 
  DollarSign, 
  ChevronRight, 
  Award 
} from 'lucide-react';
import { components } from '@/types/api';
import { User as UserModel } from '@/types/models';
import { BrandButton, BrandBadge, BrandCard } from '@/components/ui/brand';
import { 
  AssignActionDrawer, 
  ActionResolutionDrawer, 
  ActionTemplateDrawer,
  ActionFormData,
  ResolutionFormData,
  TemplateFormData,
  StoreActionObjective,
  DEFAULT_OBJECTIVES,
  DEFAULT_OBJECTIVE_MAP
} from './ActionDrawers';

type StoreActionResponse = components['schemas']['StoreActionResponse'];
type ActionTemplateResponse = components['schemas']['ActionTemplateResponse'];
type StoreResponse = components['schemas']['StoreResponse'];

export default function ActionsStrategyDesk() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  
  // Navigation / Tab states
  const [activeView, setActiveView] = useState<'desk' | 'catalog'>('desk');
  const [deskStatusFilter, setDeskStatusFilter] = useState<string>('pending');

  // Drawer / Form states
  const [isActionFormOpen, setIsActionFormOpen] = useState(false);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  
  const [selectedAction, setSelectedAction] = useState<StoreActionResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ActionTemplateResponse | null>(null);

  // Form Submissions states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch Current User
  const { data: currentUser } = useQuery<UserModel>({
    queryKey: ['me'],
    queryFn: async () => {
      return await apiClient.get<UserModel>('/auth/me');
    },
    enabled: !!token,
  });

  const isAdmin = currentUser?.is_admin || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Fetch Teammates (Admins only)
  const { data: teammates = [] } = useQuery<UserModel[]>({
    queryKey: ['teammates'],
    queryFn: async () => {
      try {
        return await apiClient.get<UserModel[]>('/admin/users');
      } catch {
        return [];
      }
    },
    enabled: !!token && isAdmin,
  });

  // Fetch Actions
  const { data: actions = [], isLoading: loadingActions } = useQuery<StoreActionResponse[]>({
    queryKey: ['actions'],
    queryFn: async () => {
      return await apiClient.get<StoreActionResponse[]>('/trade/actions');
    },
    enabled: !!token,
  });

  // Fetch Action Templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<ActionTemplateResponse[]>({
    queryKey: ['action-templates'],
    queryFn: async () => {
      return await apiClient.get<ActionTemplateResponse[]>('/trade/action-templates');
    },
    enabled: !!token,
  });

  // Fetch Store Action Objectives
  const { data: objectives = [] } = useQuery<StoreActionObjective[]>({
    queryKey: ['store-action-objectives'],
    queryFn: async () => {
      return await apiClient.get<StoreActionObjective[]>('/trade/objectives');
    },
    enabled: !!token,
  });

  // Fetch Accounts (Stores)
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      return await apiClient.get<StoreResponse[]>('/trade/stores');
    },
    enabled: !!token,
  });

  // -------------------------------------------------------------
  // FORM BINDINGS
  // -------------------------------------------------------------
  
  // Create Store Action State
  const [actionFormData, setActionFormData] = useState<ActionFormData>({
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

  // Assignees are store contacts (Clients)
  const assigneesList = useMemo(() => {
    const selectedStore = stores.find(s => s.id === actionFormData.store_id);
    return selectedStore?.clients || [];
  }, [stores, actionFormData.store_id]);

  // Resolution State (Strict completion requirements)
  const [resolutionData, setResolutionData] = useState<ResolutionFormData>({
    status: 'completed',
    resolution_notes: '',
    result_value: '',
    revenue_impact: ''
  });

  // Create Template State
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>({
    name: '',
    category: 'COMMERCIAL',
    objective: 'THREAT_RESPONSE',
    default_unit: '',
    description: '',
    target_value: '',
    impact_level: 'MEDIUM'
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
    const list = objectives.length > 0 ? objectives : DEFAULT_OBJECTIVES;
    const match = list.find(o => o.category === cat);
    setActionFormData(prev => ({
      ...prev,
      category: cat,
      objective: match ? match.name : ''
    }));
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
      await apiClient.post<StoreActionResponse>('/trade/actions', postPayload);

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
    } catch (err: unknown) {
      setError((err as Error).message);
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
      await apiClient.patch<StoreActionResponse>(`/trade/actions/${selectedAction.id}`, patchPayload);

      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setIsResolutionOpen(false);
      setSelectedAction(null);
      setResolutionData({
        status: 'completed',
        resolution_notes: '',
        result_value: '',
        revenue_impact: ''
      });
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (selectedTemplate) {
        await apiClient.patch<ActionTemplateResponse>(`/trade/action-templates/${selectedTemplate.id}`, templateFormData);
      } else {
        await apiClient.post<ActionTemplateResponse>('/trade/action-templates', templateFormData);
      }

      queryClient.invalidateQueries({ queryKey: ['action-templates'] });
      setIsTemplateFormOpen(false);
      setSelectedTemplate(null);
      setTemplateFormData({
        name: '',
        category: 'COMMERCIAL',
        objective: 'THREAT_RESPONSE',
        default_unit: '',
        description: '',
        target_value: '',
        impact_level: 'MEDIUM'
      });
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this action template?')) return;

    try {
      await apiClient.delete<void>(`/trade/action-templates/${id}`);
      queryClient.invalidateQueries({ queryKey: ['action-templates'] });
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  // Pre-seed form for resolution
  const openResolutionDrawer = (action: StoreActionResponse) => {
    setSelectedAction(action);
    setResolutionData({
      status: action.status === 'proposed' ? 'pending' : 'completed',
      resolution_notes: action.resolution_notes || '',
      result_value: (action.result_value !== undefined && action.result_value !== null) ? action.result_value.toString() : '',
      revenue_impact: (action.revenue_impact !== undefined && action.revenue_impact !== null) ? action.revenue_impact.toString() : ''
    });
    setIsResolutionOpen(true);
  };

  // Pre-seed form for template editing
  const openTemplateEdit = (tpl: ActionTemplateResponse) => {
    setSelectedTemplate(tpl);
    setTemplateFormData({
      name: tpl.name,
      category: tpl.category,
      objective: tpl.objective || 'THREAT_RESPONSE',
      default_unit: tpl.default_unit,
      description: tpl.description || '',
      target_value: ((tpl as Record<string, unknown>).target_value as string) || '',
      impact_level: ((tpl as Record<string, unknown>).impact_level as string) || 'MEDIUM'
    });
    setIsTemplateFormOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'proposed':
        return { label: 'Proposed', variant: 'accent' as const, icon: Clock };
      case 'pending':
        return { label: 'Pending', variant: 'attention' as const, icon: Clock };
      case 'completed':
        return { label: 'Completed', variant: 'confirmed' as const, icon: CheckCircle };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'alert' as const, icon: XCircle };
      default:
        return { label: 'Unknown', variant: 'neutral' as const, icon: Clock };
    }
  };

  const objectiveMap = {
    ...objectives.reduce((acc: Record<string, string>, obj: StoreActionObjective) => {
      acc[obj.name] = obj.label;
      return acc;
    }, {}),
    ...DEFAULT_OBJECTIVE_MAP
  };

  const filteredObjectives = useMemo(() => {
    const activeList = objectives.length > 0 ? objectives : DEFAULT_OBJECTIVES;
    return activeList.filter((o: StoreActionObjective) => o.category === actionFormData.category);
  }, [objectives, actionFormData.category]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header and Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-deep tracking-tight">
            Strategy Desk
          </h1>
          <p className="text-slate mt-2 font-medium text-base max-w-2xl">
            Promote proposed insights, assign reps, track due dates, and enforce execution results.
          </p>
        </div>
        
        {/* Top Level Action Buttons */}
        <div className="flex gap-3 shrink-0">
          <div className="p-1 bg-canvas border border-utility rounded-xl flex">
            <button
              onClick={() => setActiveView('desk')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeView === 'desk' ? 'bg-deep text-white shadow-sm' : 'text-slate hover:text-deep'
              }`}
            >
              Strategy Desk
            </button>
            <button
              onClick={() => setActiveView('catalog')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeView === 'catalog' ? 'bg-deep text-white shadow-sm' : 'text-slate hover:text-deep'
              }`}
            >
              Action Catalog
            </button>
          </div>
          
          {activeView === 'desk' ? (
            <BrandButton 
              variant="primary"
              onClick={() => setIsActionFormOpen(true)}
            >
              <Plus size={16} />
              Assign Action
            </BrandButton>
          ) : (
            <BrandButton 
              variant="primary"
              onClick={() => {
                setSelectedTemplate(null);
                setTemplateFormData({ 
                  name: '', 
                  category: 'COMMERCIAL', 
                  objective: 'THREAT_RESPONSE', 
                  default_unit: '', 
                  description: '', 
                  target_value: '', 
                  impact_level: 'MEDIUM' 
                });
                setIsTemplateFormOpen(true);
              }}
            >
              <Plus size={16} />
              New Action Template
            </BrandButton>
          )}
        </div>
      </div>

      {/* Analytics Summary */}
      {activeView === 'desk' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <BrandCard className="p-3.5 sm:p-5 lg:p-6 flex items-center gap-3.5 sm:gap-5">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-card border border-utility text-deep rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate uppercase tracking-wider block">Total Action Revenue</span>
              <h3 className="text-xl sm:text-2xl font-mono font-bold text-deep mt-0.5 sm:mt-1 truncate">${stats.revenueFulfillment.toFixed(2)}</h3>
            </div>
          </BrandCard>

          <BrandCard className="p-3.5 sm:p-5 lg:p-6 flex items-center gap-3.5 sm:gap-5">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-confirmed/10 border border-confirmed/20 text-confirmed rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <Award size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate uppercase tracking-wider block">Completed Actions</span>
              <h3 className="text-xl sm:text-2xl font-mono font-bold text-deep mt-0.5 sm:mt-1">{stats.completedCount}</h3>
            </div>
          </BrandCard>

          <BrandCard className="p-3.5 sm:p-5 lg:p-6 flex items-center gap-3.5 sm:gap-5 sm:col-span-2 lg:col-span-1">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-attention/10 border border-attention/20 text-attention rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <ListTodo size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate uppercase tracking-wider block">Active Pending Desk</span>
              <h3 className="text-xl sm:text-2xl font-mono font-bold text-deep mt-0.5 sm:mt-1">{stats.pendingCount}</h3>
            </div>
          </BrandCard>
        </div>
      )}

      {/* VIEW: STRATEGY DESK */}
      {activeView === 'desk' && (
        <div className="space-y-6">
          
          {/* Status Tabs Control */}
          <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-utility">
            <div className="flex flex-wrap gap-1 p-1 bg-canvas border border-utility rounded-xl">
              {['pending', 'proposed', 'completed', 'cancelled', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setDeskStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    deskStatusFilter === status 
                      ? 'bg-deep text-white shadow-sm' 
                      : 'text-slate hover:text-deep'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <span className="text-xs bg-canvas border border-utility text-slate font-bold px-3 py-1.5 rounded-full hidden md:inline-block font-mono">
              {filteredActions.length} Actions matching
            </span>
          </div>

          {/* Directory Content */}
          {loadingActions ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-deep border-t-transparent"></div>
              <span className="font-semibold text-slate text-sm">Loading Strategy Desk...</span>
            </div>
          ) : filteredActions.length === 0 ? (
            <BrandCard className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-canvas border border-utility text-slate rounded-2xl flex items-center justify-center mb-4">
                <ListTodo size={30} />
              </div>
              <h3 className="text-lg font-bold text-deep">Desk is empty</h3>
              <p className="text-slate mt-1 text-sm">No active operations match this status filter.</p>
            </BrandCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActions.map((action) => {
                const badge = getStatusBadge(action.status || 'pending');
                const BadgeIcon = badge.icon;
                const objectiveLabel = objectiveMap[action.objective || ''] || action.objective;
                
                return (
                  <BrandCard 
                    key={action.id}
                    hoverable
                    onClick={() => openResolutionDrawer(action)}
                    className="flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      {/* Badge / Category Header */}
                      <div className="flex justify-between items-start mb-5">
                        <BrandBadge variant={badge.variant}>
                          <BadgeIcon size={12} />
                          {badge.label}
                        </BrandBadge>
                        
                        <BrandBadge variant="neutral" className="uppercase text-2xs tracking-wider">
                          {action.category}
                        </BrandBadge>
                      </div>

                      {/* Action Title & Store */}
                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">Action Title</span>
                      <h3 className="text-base font-bold text-deep mt-0.5 truncate group-hover:text-deep transition-colors">
                        {((action.details as Record<string, unknown> | undefined)?.title as string) || action.template_name || 'Manual Audit'}
                      </h3>

                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mt-3">Account</span>
                      <p className="text-xs font-semibold text-slate mt-0.5 truncate">
                        {action.store_name || 'Unknown Account'}
                      </p>

                      {/* Action Specs */}
                      <div className="mt-4 space-y-2 pt-4 border-t border-utility">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate font-medium">Template</span>
                          <span className="font-bold text-deep truncate max-w-[150px]">{action.template_name || 'Manual Audit'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate font-medium">Objective</span>
                          <span className="font-bold text-deep">{objectiveLabel}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate font-medium">Assignee</span>
                          <span className="font-bold text-deep flex items-center gap-1">
                            <User size={12} className="text-slate" />
                            {action.assigned_to_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Result Reporting / Deadlines */}
                    <div className="mt-6 pt-4 border-t border-utility flex items-center justify-between">
                      {action.status === 'completed' ? (
                        <div>
                          <span className="text-[10px] font-bold text-confirmed uppercase tracking-wider block">Result</span>
                          <span className="text-sm font-mono font-bold text-deep">
                            {action.result_value} <span className="text-2xs font-sans text-slate uppercase font-semibold">{action.result_unit || 'units'}</span>
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">Due Date</span>
                          <span className="text-xs font-mono font-medium text-slate flex items-center gap-1 mt-0.5">
                            <Calendar size={12} className="text-slate" />
                            {action.due_date ? new Date(action.due_date).toLocaleDateString() : 'No Deadline'}
                          </span>
                        </div>
                      )}
                      
                      {action.status === 'completed' && action.revenue_impact && (
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-deep uppercase tracking-wider block">Fulfillment</span>
                          <span className="text-sm font-mono font-bold text-deep">${Number(action.revenue_impact).toFixed(2)}</span>
                        </div>
                      )}

                      {action.status !== 'completed' && (
                        <ChevronRight size={18} className="text-slate group-hover:text-deep group-hover:translate-x-1 transition-all" />
                      )}
                    </div>
                  </BrandCard>
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
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-deep border-t-transparent"></div>
              <span className="font-semibold text-slate text-sm">Loading catalog templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <BrandCard className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-canvas border border-utility text-slate rounded-2xl flex items-center justify-center mb-4">
                <Settings size={30} />
              </div>
              <h3 className="text-lg font-bold text-deep">Catalog is empty</h3>
              <p className="text-slate mt-1 text-sm">Define your business standard operational templates first.</p>
            </BrandCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <BrandCard 
                  key={tpl.id}
                  className="flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <BrandBadge variant="neutral" className="uppercase text-2xs tracking-wider">
                        {tpl.category}
                      </BrandBadge>
                      <span className="text-xs text-slate font-bold bg-canvas px-2.5 py-1 rounded-lg border border-utility uppercase tracking-wider font-mono">
                        Unit: {tpl.default_unit}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-deep">{tpl.name}</h3>
                      {tpl.description && (
                        <p className="text-slate text-sm mt-2 line-clamp-3 leading-relaxed font-medium">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-utility flex justify-end gap-2">
                    <BrandButton
                      variant="secondary"
                      size="sm"
                      onClick={() => openTemplateEdit(tpl)}
                    >
                      <Edit3 size={12} /> Edit
                    </BrandButton>
                    <BrandButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="text-alert hover:text-alert hover:border-alert/40"
                    >
                      <Trash2 size={12} /> Delete
                    </BrandButton>
                  </div>
                </BrandCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DRAWERS */}
      <AssignActionDrawer
        isOpen={isActionFormOpen}
        onClose={() => setIsActionFormOpen(false)}
        loading={loading}
        error={error}
        actionFormData={actionFormData}
        setActionFormData={setActionFormData}
        stores={stores}
        assigneesList={assigneesList}
        filteredObjectives={filteredObjectives}
        objectiveMap={objectiveMap}
        templates={templates}
        handleCreateAction={handleCreateAction}
        handleCategoryChange={handleCategoryChange}
        onOpenCreateTemplate={({ category, objective }) => {
          setIsActionFormOpen(false);
          setSelectedTemplate(null);
          setTemplateFormData({
            name: '',
            category,
            objective,
            default_unit: '',
            description: '',
            target_value: '',
            impact_level: 'MEDIUM',
          });
          setIsTemplateFormOpen(true);
        }}
      />

      <ActionResolutionDrawer
        isOpen={isResolutionOpen}
        onClose={() => setIsResolutionOpen(false)}
        loading={loading}
        error={error}
        selectedAction={selectedAction}
        resolutionData={resolutionData}
        setResolutionData={setResolutionData}
        objectiveMap={objectiveMap}
        handleResolveAction={handleResolveAction}
      />

      <ActionTemplateDrawer
        isOpen={isTemplateFormOpen}
        onClose={() => setIsTemplateFormOpen(false)}
        loading={loading}
        error={error}
        selectedTemplate={selectedTemplate}
        templateFormData={templateFormData}
        setTemplateFormData={setTemplateFormData}
        objectives={objectives}
        objectiveMap={objectiveMap}
        handleCreateTemplate={handleCreateTemplate}
      />

    </div>
  );
}
