'use client';

import { useState } from 'react';
import { Calendar, MessageSquare, CheckCircle2, RefreshCw, Send, Trash2, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQueryClient } from '@tanstack/react-query';
import WhatsAppModal from '@/components/WhatsAppModal';
import TelegramModal from '@/components/TelegramModal';

interface IntegrationsPanelProps {
  business: any;
  token: string | null;
  onMessage: (message: { type: string, text: string }) => void;
}

export default function IntegrationsPanel({ business, token, onMessage }: IntegrationsPanelProps) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/google/authorize`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.open(data.authorization_url, 'Connect Google Calendar', 'width=600,height=700');
      }
    } catch (err) {
      console.error('Failed to initiate Google connection', err);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? This will also clear your local cache.`)) return;
    
    setIsDisconnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/${provider}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onMessage({ type: 'success', text: `${provider} disconnected successfully.` });
        queryClient.invalidateQueries({ queryKey: ['business'] });
      } else {
        throw new Error(`Failed to disconnect ${provider}`);
      }
    } catch (err: any) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/integrations/google/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['business'] });
        setIsSyncing(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsSyncing(false);
    }
  };

  const isGoogleConnected = business?.integrations?.some((i: any) => i.provider === 'google');
  const telegramBot = business?.integrations?.find((i: any) => i.provider === 'telegram');
  const whatsappIntegration = business?.integrations?.find((i: any) => i.provider === 'whatsapp');
  const isWhatsAppConnected = !!whatsappIntegration;
  const whatsappProvider = whatsappIntegration?.settings?.provider_type === 'twilio' ? 'Twilio' : 'Cloud API';

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
        <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <Calendar size={22} />
          </div>
          <h2>Integrations</h2>
        </div>
        
        <div className="space-y-6">
          {/* Google Calendar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50/50 rounded-2xl border border-gray-100 gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">Google Calendar</p>
                <p className="text-sm text-gray-500">Sync availability and appointments.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isGoogleConnected ? (
                <>
                  <button 
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                    <CheckCircle2 size={16} />
                    Connected
                  </span>
                  <button 
                    onClick={() => handleDisconnect('google')}
                    disabled={isDisconnecting}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleGoogleConnect}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  Connect Account
                </button>
              )}
            </div>
          </div>

          {/* Telegram Bot */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50/50 rounded-2xl border border-gray-100 gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-blue-500">
                <Send size={28} />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">Telegram Bot</p>
                <p className="text-sm text-gray-500">Test the AI assistant via Telegram Bot API.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {telegramBot ? (
                <div className="flex items-center gap-3">
                  <div className="text-right mr-2">
                    <p className="text-sm font-bold text-gray-900">@{telegramBot.settings?.bot_username}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest tracking-tighter">Active Bot</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                    <CheckCircle2 size={16} />
                    Connected
                  </span>
                  <button 
                    onClick={() => handleDisconnect('telegram')}
                    disabled={isDisconnecting}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsTelegramModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  Connect Bot
                </button>
              )}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50/50 rounded-2xl border border-gray-100 gap-4">
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center ${isWhatsAppConnected ? 'text-green-500' : 'text-gray-400'}`}>
                <MessageSquare size={28} />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">WhatsApp Business</p>
                <p className="text-sm text-gray-500">
                  {isWhatsAppConnected 
                    ? `Connected via ${whatsappProvider}` 
                    : 'Automate client messaging via Twilio or Meta API.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isWhatsAppConnected ? (
                <div className="flex items-center gap-3">
                  {whatsappIntegration?.settings?.twilio_from_number && (
                    <div className="text-right mr-2">
                      <p className="text-sm font-bold text-gray-900">+{whatsappIntegration.settings.twilio_from_number}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Twilio Active</p>
                    </div>
                  )}
                  <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                    <CheckCircle2 size={16} />
                    Connected
                  </span>
                  <button 
                    onClick={() => handleDisconnect('whatsapp')}
                    disabled={isDisconnecting}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  Connect WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <WhatsAppModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['business'] })}
        token={token || ''}
      />

      <TelegramModal 
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['business'] })}
        token={token || ''}
      />
    </div>
  );
}
