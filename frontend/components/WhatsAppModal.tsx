'use client';

import { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export default function WhatsAppModal({ isOpen, onClose, onSuccess, token }: WhatsAppModalProps) {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Config, 3: Provisioning, 4: Success
  const [friendlyName, setFriendlyName] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignedNumber, setAssignedNumber] = useState('');

  if (!isOpen) return null;

  const handleStartProvisioning = async () => {
    setStep(3);
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/integrations/whatsapp/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          area_code: areaCode || undefined,
          friendly_name: friendlyName || undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Fallo al aprovisionar la línea de WhatsApp.');
      }

      const data = await res.json();
      setAssignedNumber(data.phone_number);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
      setStep(2); // Go back to config step to let them retry
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 text-left animate-in fade-in duration-300">
            <h3 className="font-bold text-lg text-gray-900">Conéctate en segundos</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Sherpa aprovisiona automáticamente un número de WhatsApp dedicado y exclusivo (+52) para tu negocio. No compartes tu canal con ningún otro comercio.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-950">Línea dedicada exclusiva (+52)</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-950">Aislamiento total de datos y clientes</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-950">Configuración automática sin programar</p>
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
            <h3 className="font-bold text-lg text-gray-900">Preferencias de tu Línea</h3>
            <p className="text-gray-600 text-sm">Define el nombre de tu canal y la lada preferida para tu nuevo número.</p>
            
            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl font-medium border border-red-100">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre del Canal (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-base font-bold"
                  placeholder="Ej. Mi Negocio WhatsApp"
                  value={friendlyName}
                  onChange={(e) => setFriendlyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Código de Área / Lada (Opcional, e.g. 55, 81)</label>
                <input 
                  type="text" 
                  maxLength={3}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-base font-bold"
                  placeholder="Ej. 55"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-150 shadow-inner">
                <input 
                  type="checkbox" 
                  id="opt-in-compliance"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="opt-in-compliance" className="text-xs text-gray-500 font-semibold leading-relaxed select-none cursor-pointer">
                  Confirmo que poseo el consentimiento explícito (opt-in) de mis clientes para iniciar el contacto y enviar notificaciones vía WhatsApp, cumpliendo con las políticas de Twilio/Meta.
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Atrás</button>
              <button 
                disabled={!optIn || loading}
                onClick={handleStartProvisioning}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
              >
                Aprovisionar Línea
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
              <Loader2 size={48} className="animate-spin" />
            </div>
            <h3 className="font-bold text-2xl text-gray-900 tracking-tight">Aprovisionando Línea Dedicada...</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
              Por favor espera mientras creamos tu cuenta en Twilio, compramos tu número (+52) y configuramos los webhooks de mensajería. Esto puede tardar hasta 15 segundos.
            </p>
          </div>
        );
      case 4:
        return (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Línea Activada!</h2>
            <p className="text-gray-500 font-medium">Tu número dedicado de WhatsApp ya está listo:</p>
            
            <div className="bg-gray-900 text-white p-6 rounded-[2rem] space-y-2 max-w-sm mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MessageSquare size={80} />
              </div>
              <p className="text-xs text-green-400 font-bold uppercase tracking-widest">Número Asignado</p>
              <p className="text-2xl font-black tracking-tight">{assignedNumber}</p>
            </div>
            
            <button 
              onClick={() => {
                onSuccess();
                onClose();
                setStep(1);
              }}
              className="w-full max-w-sm py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center mx-auto shadow-md"
            >
              Terminar
            </button>
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
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-sm border border-green-100">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">WhatsApp Setup</h2>
              <p className="text-green-700 text-xs font-bold uppercase tracking-widest">Línea Dedicada</p>
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
