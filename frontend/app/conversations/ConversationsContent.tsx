'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, User, Bot, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import SafeDate from '@/components/SafeDate';
import { toast } from 'sonner';
import { components } from '@/types/api';
import { BrandButton, BrandBadge, BrandCard } from '@/components/ui/brand';

type ConversationResponse = components['schemas']['ConversationResponse'];
type MessageResponse = components['schemas']['MessageResponse'];

interface ConversationsContentProps {
  initialConversations: ConversationResponse[];
  token: string | null;
}

export default function ConversationsContent({ initialConversations, token }: ConversationsContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations (with audit log support)
  const { data: conversations = initialConversations, isLoading: isLoadingConvs } = useQuery<ConversationResponse[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      return await apiClient.get<ConversationResponse[]>('/inbox/conversations');
    },
    initialData: initialConversations,
    refetchInterval: 5000,
  });

  // 2. Fetch Messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMsgs } = useQuery<MessageResponse[]>({
    queryKey: ['messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      return apiClient.get<MessageResponse[]>(`/inbox/conversations/${selectedConvId}/messages`);
    },
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  // 3. Toggle AI Mutation
  const toggleAiMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string, enabled: boolean }) => {
      return apiClient.patch(`/inbox/conversations/${id}`, { ai_enabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success("AI status updated");
    }
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredConvs = conversations.filter((c) => 
    c.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.platform_chat_id?.includes(searchTerm)
  );

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-deep tracking-tight">Inbox</h1>
            <BrandBadge variant="ear" className="text-[10px] font-mono uppercase tracking-widest font-black">
              Listening Network
            </BrandBadge>
          </div>
          {isLoadingConvs && <Loader2 className="w-4 h-4 text-deep animate-spin" />}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Chat List (Ear Subsystem) */}
        <div className="w-full md:w-[350px] lg:w-[380px] bg-white rounded-2xl border border-utility shadow-brand-subtle flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-utility">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate/50 group-focus-within:text-deep transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-black/[0.02] border border-utility rounded-xl text-xs focus:bg-white focus:border-deep focus:ring-2 focus:ring-deep/10 outline-none transition-all font-medium text-deep placeholder:text-slate/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConvs.length > 0 ? (
              <div className="divide-y divide-utility">
                {filteredConvs.map((conv) => (
                  <div 
                    key={conv.id} 
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-4 cursor-pointer transition-all flex items-center gap-3.5 relative group ${
                      selectedConvId === conv.id ? 'bg-black/[0.03]' : 'hover:bg-black/[0.015]'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black border transition-all ${
                        selectedConvId === conv.id 
                          ? 'bg-deep text-white border-deep shadow-brand-subtle' 
                          : 'bg-black/[0.03] text-slate border-utility group-hover:border-slate/40'
                      }`}>
                        {conv.client?.name?.charAt(0) || '?'}
                      </div>
                      {(conv.client?.custom_fields as any)?.needs_review && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-alert border-2 border-white rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={`font-bold text-sm truncate ${selectedConvId === conv.id ? 'text-deep' : 'text-slate'}`}>
                          {conv.client?.name || 'Unknown Client'}
                        </p>
                        <span className="text-[10px] font-mono font-bold text-slate/60 uppercase whitespace-nowrap">
                          {conv.platform}
                        </span>
                      </div>
                      <p className="text-xs text-slate/60 truncate font-medium">
                        {conv.last_message_at ? (
                          <SafeDate date={conv.last_message_at} format="time" options={{ hour: '2-digit', minute: '2-digit' }} />
                        ) : (
                          'No messages'
                        )}
                      </p>
                    </div>
                    
                    {selectedConvId === conv.id && (
                      <div className="w-1 h-8 bg-deep rounded-full absolute right-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-6">
                <div className="w-14 h-14 bg-black/[0.02] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-utility">
                  <MessageSquare size={24} className="text-slate/40" />
                </div>
                <p className="text-deep text-sm font-bold tracking-tight">No active chats</p>
                <p className="text-slate text-xs mt-1 leading-relaxed">Incoming messaging conversations will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Detail */}
        <div className="flex-1 bg-white rounded-2xl border border-utility shadow-brand-subtle flex flex-col overflow-hidden relative">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 md:p-5 border-b border-utility flex items-center justify-between bg-black/[0.015] shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-deep text-white rounded-xl flex items-center justify-center font-bold shadow-brand-subtle">
                    {selectedConv.client?.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-deep leading-tight text-sm">{selectedConv.client?.name}</h3>
                    <p className="text-[10px] text-slate/60 font-mono font-bold uppercase tracking-wider mt-0.5">{selectedConv.platform_chat_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                  {/* Audit Mode Toggle (Epic 205.1) */}
                  <button 
                    onClick={() => {
                      const next = !devMode;
                      setDevMode(next);
                      if (next) {
                        toast.info("Brain Logic Audit Enabled: Tracing AI reasoning for all turns");
                      } else {
                        toast.info("Audit Mode Disabled");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      devMode 
                        ? 'bg-[var(--brain)] text-[var(--brain-ink)] border-[var(--brain-ink)]/30 shadow-brand-subtle ring-2 ring-[var(--brain-ink)]/10' 
                        : 'bg-black/[0.02] text-slate border-utility hover:text-deep hover:bg-black/5'
                    }`}
                  >
                    <Sparkles size={13} className={devMode ? 'animate-pulse text-[var(--brain-ink)]' : 'text-slate/60'} />
                    <span>{devMode ? 'Brain Logic: ON' : 'Audit: OFF'}</span>
                  </button>

                  {(selectedConv.client?.custom_fields as any)?.needs_review && (
                    <BrandBadge variant="alert" className="text-[10px] uppercase font-black tracking-wider py-0.5 px-2">
                      <AlertCircle size={11} />
                      Action Required
                    </BrandBadge>
                  )}
                  
                  <div className="h-5 w-px bg-utility mx-1" />
                  
                  <button 
                    onClick={() => toggleAiMutation.mutate({ id: selectedConv.id, enabled: !selectedConv.ai_enabled })}
                    disabled={toggleAiMutation.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedConv.ai_enabled 
                        ? 'bg-[rgba(22,112,82,0.12)] text-[var(--success)] border-[var(--success)]/30' 
                        : 'bg-black/[0.02] text-slate border-utility'
                    }`}
                  >
                    <Bot size={13} className={selectedConv.ai_enabled ? 'animate-pulse' : ''} />
                    <span>{selectedConv.ai_enabled ? 'AI Active' : 'AI Paused'}</span>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-black/[0.01]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%] space-y-1.5">
                      <div className={`px-4 py-3 rounded-2xl text-sm font-medium shadow-brand-subtle leading-relaxed ${
                        m.role === 'user' 
                          ? 'bg-white border border-utility text-deep rounded-tl-sm' 
                          : 'bg-deep text-white rounded-tr-sm'
                      }`}>
                        {m.content}
                      </div>

                      {/* Brain Logic Audit Trace Panel (Epic 205.1) */}
                      {devMode && m.role === 'assistant' && (
                        <div 
                          className="mt-2 p-3.5 rounded-xl text-[11px] font-mono leading-relaxed whitespace-pre-wrap shadow-brand-subtle border"
                          style={{
                            backgroundColor: 'var(--brain)',
                            color: 'var(--brain-ink)',
                            borderColor: 'rgba(96, 72, 18, 0.2)',
                          }}
                        >
                          <div className="flex items-center gap-1.5 font-black mb-1.5 text-[9px] uppercase tracking-widest opacity-90">
                            <Sparkles size={11} />
                            Brain Logic · Reasoning Trace
                          </div>
                          {m.reasoning_trace || "Direct model response (No operational tool execution required)"}
                        </div>
                      )}

                      <div className={`flex items-center gap-1 text-[10px] font-mono text-slate/50 uppercase tracking-tighter ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                        <SafeDate date={m.created_at} format="time" options={{ hour: '2-digit', minute: '2-digit' }} />
                      </div>
                    </div>
                  </div>
                ))}
                {isLoadingMsgs && messages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-slate/40 animate-spin" />
                  </div>
                )}
              </div>

              {/* Quick Reply (Read-only for MVP) */}
              <div className="p-4 bg-white border-t border-utility">
                <div className="bg-black/[0.02] rounded-xl p-3 text-center border border-dashed border-utility">
                  <p className="text-xs text-slate/60 font-bold uppercase tracking-widest">Manual replies via external channel</p>
                  <p className="text-[11px] text-slate/50 mt-0.5">Use your device to reply directly on {selectedConv.platform}.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 bg-black/[0.03] rounded-2xl flex items-center justify-center text-deep mb-4 border border-utility shadow-brand-subtle">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-black text-deep tracking-tight">Select a conversation</h3>
              <p className="text-slate font-medium text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                Choose a client or prospect from the list to review their messaging trajectory and inspect the AI Brain trace.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

