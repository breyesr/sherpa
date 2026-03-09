'use client';

import { MessageSquare, Search, Filter } from 'lucide-react';

export default function ConversationsPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inbox</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Chat List */}
        <div className="w-1/3 bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search chats..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="text-center py-20 px-6">
              <MessageSquare size={40} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 text-sm font-medium">No active conversations</p>
              <p className="text-gray-400 text-xs mt-1">Once you connect WhatsApp, messages from clients will appear here.</p>
            </div>
          </div>
        </div>

        {/* Chat Detail */}
        <div className="flex-1 bg-white rounded-2xl border shadow-sm flex items-center justify-center relative overflow-hidden">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Select a conversation</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mt-1">
              Choose a client from the left to view their appointment request history and messages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
