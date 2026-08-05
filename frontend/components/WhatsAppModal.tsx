'use client';

import { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export default function WhatsAppModal({ isOpen, onClose, onSuccess }: WhatsAppModalProps) {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Connect/Onboard, 3: Provisioning, 4: Success
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignedNumber, setAssignedNumber] = useState('');

  // Meta credentials loaded from backend
  const [appId, setAppId] = useState('');
  const [configId, setConfigId] = useState('');

  // Manual configuration fallback for testing/dev
  const [manualMode, setManualMode] = useState(false);
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [phoneNum, setPhoneNum] = useState('');

  useEffect(() => {
    if (isOpen) {
      apiClient.get<{ app_id: string; config_id: string }>('/integrations/whatsapp/config')
        .then(res => {
          setAppId(res.app_id || '');
          setConfigId(res.config_id || '');
        })
        .catch(err => console.error('Failed to load WhatsApp configuration:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFacebookConnect = () => {
    if (!appId || !configId) {
      setError('Las credenciales de Meta no están completamente configuradas en el servidor. Contacta al administrador.');
      return;
    }
    
    setError('');
    setStep(3);
    setLoading(true);
    
    const launchFBLogin = () => {
      // @ts-expect-error Meta Embedded Signup callback handles response
      window.FB.login(
        // @ts-expect-error response is passed from FB popup
        (response) => {
          if (response.authResponse && response.authResponse.code) {
            handleMetaOnboard(response.authResponse.code);
          } else {
            setError('No se completó el registro de Facebook. Por favor, intenta de nuevo.');
            setStep(2);
            setLoading(false);
          }
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true
        }
      );
    };

    // @ts-expect-error FB sdk check
    if (window.FB) {
      launchFBLogin();
    } else {
      // @ts-expect-error fbAsyncInit setup
      window.fbAsyncInit = function() {
        // @ts-expect-error FB init
        window.FB.init({
          appId      : appId,
          cookie     : true,
          xfbml      : true,
          version    : 'v22.0'
        });
        launchFBLogin();
      };
      
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/es_LA/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  };

  const handleMetaOnboard = async (code: string) => {
    try {
      const data = await apiClient.post<{ phone_number: string }>('/integrations/whatsapp/meta-onboard', {
        code
      });
      setAssignedNumber(data.phone_number);
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al vincular tu cuenta de WhatsApp en el backend.');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneId || !wabaId || !phoneNum) {
      setError('Por favor llena todos los campos obligatorios.');
      return;
    }

    setStep(3);
    setLoading(true);
    setError('');

    try {
      const data = await apiClient.post<{ phone_number: string }>('/integrations/whatsapp/meta-onboard', {
        phone_number_id: phoneId,
        waba_id: wabaId,
        display_phone_number: phoneNum
      });
      setAssignedNumber(data.phone_number);
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar la configuración manual.');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 text-left animate-in fade-in duration-300">
            <h3 className="font-bold text-lg text-gray-900">Conecta tu cuenta de WhatsApp</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Sherpa te permite integrar la plataforma oficial de WhatsApp Business en segundos. Conecta tu cuenta comercial directamente sin configuraciones complejas.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-950">Usa tu propio número comercial oficial</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-950">Aprobado y respaldado por Meta Cloud API</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-950">Asistente de inicio de sesión rápido en 2 minutos</p>
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
            >
              Comenzar Configuración <ChevronRight size={18} />
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 text-left animate-in slide-in-from-right-4 duration-300">
            <h3 className="font-bold text-lg text-gray-900">Enlace con Meta</h3>
            <p className="text-gray-600 text-sm">
              {manualMode 
                ? 'Ingresa los identificadores de tu cuenta de Meta Developer directamente.' 
                : 'Haz clic en el botón de abajo para iniciar sesión con Facebook y seleccionar tu cuenta de WhatsApp Business.'
              }
            </p>
            
            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl font-medium border border-red-100">
                {error}
              </p>
            )}

            {!manualMode ? (
              // Embedded Signup Option
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-150 shadow-inner">
                  <input 
                    type="checkbox" 
                    id="opt-in-compliance"
                    checked={optIn}
                    onChange={(e) => setOptIn(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 cursor-pointer"
                  />
                  <label htmlFor="opt-in-compliance" className="text-xs text-gray-500 font-semibold leading-relaxed select-none cursor-pointer">
                    Confirmo que poseo el consentimiento explícito de mis clientes para iniciar el contacto y enviar notificaciones vía WhatsApp, cumpliendo con las políticas de Meta.
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Atrás</button>
                  <button 
                    disabled={!optIn || loading}
                    onClick={handleFacebookConnect}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Conectar con Facebook
                  </button>
                </div>
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={() => { setManualMode(true); setError(''); }}
                    className="text-xs text-gray-400 hover:text-green-600 underline font-semibold"
                  >
                    Configurar manualmente (Desarrolladores)
                  </button>
                </div>
              </div>
            ) : (
              // Manual Fallback Form
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phone Number ID (ID del número)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold"
                    placeholder="Ej. 102938475610293"
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value.trim())}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">WhatsApp Business Account ID (ID de la WABA)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold"
                    placeholder="Ej. 987654321098765"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value.trim())}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Número de WhatsApp (con lada)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold"
                    placeholder="Ej. +5215512345678"
                    value={phoneNum}
                    onChange={(e) => setPhoneNum(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setManualMode(false); setError(''); }} 
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
                  >
                    Usar Asistente
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all text-sm shadow-md"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      case 3:
        return (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
              <Loader2 size={48} className="animate-spin" />
            </div>
            <h3 className="font-bold text-2xl text-gray-900 tracking-tight">Finalizando integración...</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
              Por favor espera mientras enlazamos tu cuenta de WhatsApp Business en el servidor de Sherpa y registramos tus identificadores en la base de datos de Staging.
            </p>
          </div>
        );
      case 4:
        return (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Canal Enlazado!</h2>
            <p className="text-gray-500 font-medium">Tu línea de WhatsApp oficial ha sido vinculada correctamente:</p>
            
            <div className="bg-gray-900 text-white p-6 rounded-[2rem] space-y-2 max-w-sm mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MessageSquare size={80} />
              </div>
              <p className="text-xs text-green-400 font-bold uppercase tracking-widest">Número de WhatsApp</p>
              <p className="text-2xl font-black tracking-tight">{assignedNumber}</p>
            </div>
            
            <button 
              onClick={() => {
                onSuccess();
                onClose();
                setStep(1);
                setManualMode(false);
              }}
              className="w-full max-w-sm py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center mx-auto shadow-md"
            >
              Finalizar
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        <div className="p-8 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-sm border border-green-100">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">WhatsApp Setup</h2>
              <p className="text-green-700 text-xs font-bold uppercase tracking-widest">Meta Cloud API</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={step === 3}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full disabled:opacity-50"
          >
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
