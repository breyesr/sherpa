'use client';

import { useState, useEffect } from 'react';
import { Calendar, MessageSquare, CheckCircle2, RefreshCw, Send, Trash2, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQueryClient } from '@tanstack/react-query';
import WhatsAppModal from '@/components/WhatsAppModal';
import TelegramModal from '@/components/TelegramModal';

import { components } from '@/types/api';

type BusinessProfileResponse = components['schemas']['BusinessProfileResponse'];

interface IntegrationsPanelProps {
  business: BusinessProfileResponse;
  token: string | null;
  onMessage: (message: { type: string, text: string }) => void;
}

export default function IntegrationsPanel({ business, token, onMessage }: IntegrationsPanelProps) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{
    status: 'connected' | 'disconnected' | 'pending_verification' | 'error' | 'loading';
    twilio_from_number?: string;
    error_message?: string;
  }>({ status: 'loading' });
  const [whatsappUsage, setWhatsappUsage] = useState<{
    used: number;
    free_limit: number;
    purchased: number;
    total_limit: number;
    remaining: number;
    percent_used: number;
  } | null>(null);

  const fetchWhatsAppStatus = async () => {
    const waIntegration = (business?.integrations as any[])?.find((i: any) => i.provider === 'whatsapp');
    if (!waIntegration) {
      setWhatsappStatus({ status: 'disconnected' });
      setWhatsappUsage(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data);
      } else {
        setWhatsappStatus({ status: 'error', error_message: 'Fallo al verificar credenciales.' });
      }
    } catch (err) {
      setWhatsappStatus({ status: 'error', error_message: 'Fallo de conexión al validar estado.' });
    }
  };

  const fetchWhatsAppUsage = async () => {
    const waIntegration = (business?.integrations as any[])?.find((i: any) => i.provider === 'whatsapp');
    if (!waIntegration) {
      setWhatsappUsage(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/whatsapp/usage/${business.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp usage', err);
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();
    fetchWhatsAppUsage();
  }, [business?.integrations, business?.id]);


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
    } catch (err: any) {
      console.error(err);
      setIsSyncing(false);
    }
  };

  const isGoogleConnected = (business?.integrations as any[])?.some((i: any) => i.provider === 'google');
  const telegramBot = (business?.integrations as any[])?.find((i: any) => i.provider === 'telegram');
  const whatsappIntegration = (business?.integrations as any[])?.find((i: any) => i.provider === 'whatsapp');
  const isWhatsAppConnected = !!whatsappIntegration;
  const whatsappProvider = (whatsappIntegration?.settings as any)?.provider_type === 'twilio' ? 'Twilio' : 'Cloud API';

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
          <div className="flex flex-col p-6 bg-gray-50/50 rounded-2xl border border-gray-100 gap-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center ${isWhatsAppConnected ? 'text-green-500' : 'text-gray-400'}`}>
                  <MessageSquare size={28} />
                </div>
                <div className="space-y-1.5">
                  <p className="font-bold text-lg text-gray-900">WhatsApp Business</p>
                  <p className="text-sm text-gray-500">
                    {isWhatsAppConnected 
                      ? 'Línea dedicada exclusiva conectada.' 
                      : 'Automatiza mensajes con tus clientes usando una línea dedicada (+52).'}
                  </p>
                  {whatsappStatus.status === 'error' && whatsappStatus.error_message && (
                    <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 px-3.5 py-2 rounded-xl border border-red-100 shadow-sm w-fit mt-1">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{whatsappStatus.error_message}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 self-center md:self-start">
                {whatsappStatus.status === 'loading' ? (
                  <span className="flex items-center gap-1.5 text-gray-400 font-bold text-sm bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">
                    <Loader2 size={16} className="animate-spin" />
                    Checking...
                  </span>
                ) : isWhatsAppConnected ? (
                  <div className="flex items-center gap-3">
                    {(whatsappIntegration?.settings?.phone_number || whatsappIntegration?.settings?.twilio_from_number) && (
                      <div className="text-right mr-2">
                        <p className="text-sm font-bold text-gray-900">
                          +{ (whatsappIntegration.settings.phone_number || whatsappIntegration.settings.twilio_from_number).replace(/\D/g, '') }
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Activo</p>
                      </div>
                    )}
                    {whatsappStatus.status === 'connected' && (
                      <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                        <CheckCircle2 size={16} />
                        Conectado
                      </span>
                    )}
                    {whatsappStatus.status === 'pending_verification' && (
                      <span className="flex items-center gap-1.5 text-amber-600 font-bold text-sm bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                        <AlertTriangle size={16} />
                        Pendiente
                      </span>
                    )}
                    {whatsappStatus.status === 'error' && (
                      <span className="flex items-center gap-1.5 text-red-600 font-bold text-sm bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                        <AlertCircle size={16} />
                        Error de Conexión
                      </span>
                    )}
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
                    Conectar WhatsApp
                  </button>
                )}
              </div>
            </div>

            {/* Consumption and usage limits */}
            {isWhatsAppConnected && whatsappUsage && (
              <div className="mt-2 pt-4 border-t border-gray-100 space-y-2 animate-in fade-in duration-300">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <span>Mensajes Enviados / Recibidos</span>
                  <span className={`${whatsappUsage.percent_used >= 100 ? 'text-red-600 font-extrabold' : whatsappUsage.percent_used >= 80 ? 'text-amber-600' : 'text-green-600'}`}>
                    {whatsappUsage.used} / {whatsappUsage.total_limit} mensajes
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      whatsappUsage.percent_used >= 100 
                        ? 'bg-red-500 shadow-md shadow-red-500/20' 
                        : whatsappUsage.percent_used >= 80 
                          ? 'bg-amber-500 shadow-md shadow-amber-500/20' 
                          : 'bg-green-500 shadow-md shadow-green-500/20'
                    }`}
                    style={{ width: `${whatsappUsage.percent_used}%` }}
                  />
                </div>
                {whatsappUsage.percent_used >= 100 ? (
                  <p className="text-xs text-red-600 font-medium">Límite mensual alcanzado. La IA de Sherpa está en pausa hasta el fin de mes o hasta que compres más créditos.</p>
                ) : whatsappUsage.percent_used >= 80 ? (
                  <p className="text-xs text-amber-600 font-medium font-bold animate-pulse">Advertencia: Has consumido el 80% de tus mensajes mensuales. Contacta soporte para añadir más créditos.</p>
                ) : null}
              </div>
            )}
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
