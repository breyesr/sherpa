'use client';

import { useState, useEffect } from 'react';
import { X, Send, ExternalLink, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  initialStep?: number;
}

export default function TelegramModal({ isOpen, onClose, onSuccess, token, initialStep = 1 }: TelegramModalProps) {
  const [step, setStep] = useState(initialStep);
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deepLinkUrl, setDeepLinkUrl] = useState('');
  const [adminLinked, setAdminLinked] = useState(false);

  const fetchBindToken = async () => {
    setError('');
    try {
      const tokenData = await apiClient.post<{ deep_link_url?: string }>('/telegram/generate-bind-token');
      if (tokenData.deep_link_url) {
        setDeepLinkUrl(tokenData.deep_link_url);
      } else {
        throw new Error('Telegram bot is linked, but has no username configured.');
      }
    } catch (tokenErr: unknown) {
      console.error('Failed to generate admin bind token:', tokenErr);
      setError(tokenErr instanceof Error ? tokenErr.message : 'An unexpected error occurred');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setError('');
      setBotToken('');
      setDeepLinkUrl('');
      setAdminLinked(false);
      if (initialStep === 3) {
        fetchBindToken();
      }
    }
  }, [isOpen, initialStep]);

  // Poll for admin binding status when on step 3
  useEffect(() => {
    let intervalId: number | undefined = undefined;
    if (step === 3 && isOpen) {
      setAdminLinked(false);
      const checkStatus = async () => {
        try {
          const data = await apiClient.get<{ admin_linked?: boolean }>('/telegram/bind-status');
          if (data.admin_linked) {
            setAdminLinked(true);
            if (intervalId !== undefined) {
              window.clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error('Failed to check bind status:', err);
        }
      };
      
      checkStatus();
      intervalId = window.setInterval(checkStatus, 2000) as unknown as number;
    }
    
    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [step, isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Link Telegram Bot
      await apiClient.post('/telegram/link', { bot_token: botToken });

      // 2. Generate Admin Deep Link Token
      await fetchBindToken();

      setStep(3); // Go to Admin Deep Link/QR step
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0 font-bold">1</div>
              <div>
                <p className="font-bold text-blue-900">Open Telegram</p>
                <p className="text-sm text-blue-700 mt-1">Search for <span className="font-mono bg-white px-1 rounded">@BotFather</span> or click the button below.</p>
                <a 
                  href="https://t.me/botfather" 
                  target="_blank" 
                  className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-blue-600 hover:underline"
                >
                  Go to @BotFather <ExternalLink size={14} />
                </a>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex gap-4 opacity-50">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm shrink-0 font-bold">2</div>
              <div>
                <p className="font-bold text-gray-900">Create your Bot</p>
                <p className="text-sm text-gray-600 mt-1">Send the command <span className="font-mono">/newbot</span> and follow the instructions.</p>
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              I&apos;m at @BotFather, next step
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0 font-bold">2</div>
              <div>
                <p className="font-bold text-blue-900">Get your API Token</p>
                <p className="text-sm text-blue-700 mt-1">
                  Once created, @BotFather will give you a &quot;token&quot; (it looks like <span className="font-mono">12345:ABC...</span>).
                </p>
              </div>
            </div>
            <div className="p-4 bg-white border-2 border-dashed border-blue-200 rounded-2xl">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Paste your Token here</label>
              <input 
                autoFocus
                type="password" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                placeholder="123456:ABC-DEF..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl font-medium border border-red-100">{error}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Back
              </button>
              <button 
                disabled={!botToken || loading}
                onClick={handleSubmit}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect my Bot'}
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col items-center">
              <p className="font-bold text-blue-900 text-lg">Vincular Administrador</p>
              <p className="text-sm text-blue-700 mt-2">
                Para que Sherpa te reconozca como Administrador/Vendedor y responda con los reportes de ventas, escanea el código QR con tu celular o haz clic en el botón de abajo para abrir Telegram y vincular tu cuenta:
              </p>
              
              {adminLinked ? (
                <div className="mt-6 space-y-4 w-full p-4 bg-white rounded-2xl border border-green-100 shadow-sm animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 border border-green-200 mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <p className="font-bold text-green-900 text-lg">¡Administrador Vinculado!</p>
                  <p className="text-sm text-green-600">Tu cuenta de Telegram ha sido correctamente asociada a tu perfil de Sherpa.</p>
                </div>
              ) : deepLinkUrl ? (
                <div className="mt-5 space-y-5 w-full animate-in fade-in duration-300">
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-sm border border-gray-100 mx-auto">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLinkUrl)}`} 
                      alt="Telegram Admin QR Link" 
                      className="w-44 h-44 object-contain mx-auto"
                    />
                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">Escanea con tu celular</p>
                  </div>

                  <a 
                    href={deepLinkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 w-full"
                  >
                    Vincular mi Telegram <ExternalLink size={18} />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-4">Generando enlace de vinculación...</p>
              )}
            </div>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl font-medium border border-red-100 mt-4">{error}</p>}
            
            <button 
              onClick={() => {
                setStep(4);
                setTimeout(() => {
                  onSuccess();
                  onClose();
                  setStep(1);
                  setBotToken('');
                  setDeepLinkUrl('');
                }, 2000);
              }}
              className={`w-full py-4 rounded-2xl font-bold transition-all shadow-md ${adminLinked ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {adminLinked ? 'Terminar Configuración' : 'Finalizar / Siguiente'}
            </button>
          </div>
        );
      case 4:
        return (
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Successfully Connected!</h2>
            <p className="text-gray-500">Your Sherpa AI assistant is now live on Telegram.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        <div className="p-8 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
              <Send size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Telegram Setup</h2>
              <p className="text-blue-700 text-xs font-bold uppercase tracking-widest">Assistant Wizard</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
