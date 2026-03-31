'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, Filter, User, Send, Bot, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';

interface ConversationsContentProps {
  initialConversations: any[];
  token: string | null;
}

export default function ConversationsContent({ initialConversations, token }: ConversationsContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations
  const { data: conversations = initialConversations, isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/inbox/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    initialData: initialConversations,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // 2. Fetch Messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMsgs } = useQuery({
    queryKey: ['messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const res = await fetch(`${API_BASE_URL}/inbox/conversations/${selectedConvId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!selectedConvId,
    refetchInterval: 3000, // Poll active chat faster
  });

  // 3. Toggle AI Mutation
  const toggleAiMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string, enabled: boolean }) => {
      const res = await fetch(`${API_BASE_URL}/inbox/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ai_enabled: enabled })
      });
      return res.json();
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

  const filteredConvs = conversations.filter((c: any) => 
    c.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.platform_chat_id?.includes(searchTerm)
  );

  const selectedConv = conversations.find((c: any) => c.id === selectedConvId);

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Inbox</h1>
          {isLoadingConvs && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Chat List */}
        <div className="w-full md:w-[350px] lg:w-[400px] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-gray-50">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search conversations..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConvs.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {filteredConvs.map((conv: any) => (
                  <div 
                    key={conv.id} 
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-5 cursor-pointer transition-all flex items-center gap-4 relative group ${
                      selectedConvId === conv.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm transition-transform group-hover:scale-105 ${
                        selectedConvId === conv.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {conv.client?.name?.charAt(0) || '?'}
                      </div>
                      {conv.client?.custom_fields?.needs_review && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className={`font-bold truncate ${selectedConvId === conv.id ? 'text-blue-900' : 'text-gray-900'}`}>
                          {conv.client?.name || 'Unknown Client'}
                        </p>
                        <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
                          {conv.platform}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate font-medium">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No messages'}
                      </p>
                    </div>
                    
                    {selectedConvId === conv.id && (
                      <div className="w-1 h-10 bg-blue-600 rounded-full absolute right-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 px-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-gray-200" />
                </div>
                <p className="text-gray-500 text-sm font-bold tracking-tight">No active chats</p>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">Once you connect your bot, client messages will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Detail */}
        <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">
                    {selectedConv.client?.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-none">{selectedConv.client?.name}</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1.5">{selectedConv.platform_chat_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {selectedConv.client?.custom_fields?.needs_review && (
                    <span className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-red-100">
                      <AlertCircle size={12} />
                      Action Required
                    </span>
                  )}
                  
                  <div className="h-8 w-px bg-gray-200 mx-2" />
                  
                  <button 
                    onClick={() => toggleAiMutation.mutate({ id: selectedConv.id, enabled: !selectedConv.ai_enabled })}
                    disabled={toggleAiMutation.isPending}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedConv.ai_enabled 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    <Bot size={14} className={selectedConv.ai_enabled ? 'animate-pulse' : ''} />
                    {selectedConv.ai_enabled ? 'AI Active' : 'AI Paused'}
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-gray-50/20">
                {messages.map((m: any) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[70%] space-y-1.5">
                      <div className={`px-5 py-3.5 rounded-[1.5rem] text-sm font-medium shadow-sm leading-relaxed ${
                        m.role === 'user' 
                        ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none' 
                        : 'bg-blue-600 text-white rounded-tr-none'
                      }`}>
                        {m.content}
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoadingMsgs && messages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-200 animate-spin" />
                  </div>
                )}
              </div>

              {/* Quick Reply (Read-only for MVP unless we add Send API) */}
              <div className="p-6 bg-white border-t border-gray-50">
                <div className="bg-gray-50 rounded-[1.5rem] p-4 text-center border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Manual replies coming soon</p>
                  <p className="text-[10px] text-gray-400 mt-1">Use your phone to reply directly on {selectedConv.platform} for now.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/10">
              <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 mb-6 shadow-inner">
                <MessageSquare size={48} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Select a conversation</h3>
              <p className="text-gray-500 font-medium max-w-sm mx-auto mt-3 leading-relaxed">
                Choose a client from the list to view their message history and manage the AI assistant.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
