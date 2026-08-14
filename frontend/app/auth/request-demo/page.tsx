'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/config';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function RequestDemoPage() {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [primaryUseCase, setPrimaryUseCase] = useState('trade'); // 'trade' or 'b2c'
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          business_name: businessName,
          email,
          phone_number: phoneNumber,
          primary_use_case: primaryUseCase
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit demo request.');
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-lg p-8 md:p-10 space-y-6 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-2 border border-emerald-500/20 animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-white">¡Solicitud Recibida!</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">
              Gracias por tu interés en Xerpa. Tu solicitud de demo/cuenta ha sido registrada con éxito.
            </p>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 text-slate-300 text-sm text-left w-full space-y-2">
            <p className="font-semibold text-white">Próximos pasos:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
              <li>Nuestro equipo analizará los detalles de tu negocio.</li>
              <li>Te enviaremos un correo de confirmación para agendar tu llamada.</li>
              <li>Nos pondremos en contacto en menos de 24 horas hábiles.</li>
            </ul>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg p-8 md:p-10 space-y-6 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl relative z-10">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Volver
        </Link>

        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-black tracking-tight text-white">Solicitar Demo / Cuenta</h2>
          <p className="text-slate-400 text-sm font-medium">
            Completa los detalles de tu negocio y te configuraremos un ambiente demo.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/40 text-red-400 rounded-2xl text-center text-sm font-medium border border-red-900/50">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full p-3 bg-slate-950/60 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 text-white"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Nombre de tu Negocio / Empresa
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej. Distribuidora del Norte"
              className="w-full p-3 bg-slate-950/60 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 text-white"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Correo Electrónico de Contacto
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@negocio.com"
              className="w-full p-3 bg-slate-950/60 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 text-white"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Teléfono de Contacto
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ej. +52 55 1234 5678"
              className="w-full p-3 bg-slate-950/60 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 text-white"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Caso de Uso Principal
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`border rounded-2xl p-4 flex flex-col gap-1 cursor-pointer transition-all ${
                primaryUseCase === 'trade' 
                  ? 'border-indigo-500 bg-indigo-900/10 text-white' 
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}>
                <input 
                  type="radio" 
                  name="useCase" 
                  value="trade"
                  checked={primaryUseCase === 'trade'}
                  onChange={() => setPrimaryUseCase('trade')}
                  className="sr-only"
                />
                <span className="font-bold text-sm">Ventas B2B (Trade CRM)</span>
                <span className="text-[10px] text-slate-500 leading-tight">Para representantes de ventas de campo e inteligencia comercial.</span>
              </label>

              <label className={`border rounded-2xl p-4 flex flex-col gap-1 cursor-pointer transition-all ${
                primaryUseCase === 'b2c' 
                  ? 'border-indigo-500 bg-indigo-900/10 text-white' 
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}>
                <input 
                  type="radio" 
                  name="useCase" 
                  value="b2c"
                  checked={primaryUseCase === 'b2c'}
                  onChange={() => setPrimaryUseCase('b2c')}
                  className="sr-only"
                />
                <span className="font-bold text-sm">Citas B2C (Scheduler)</span>
                <span className="text-[10px] text-slate-500 leading-tight">Para agendar y recordar citas a clientes finales automáticamente.</span>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Registrando solicitud...
              </>
            ) : (
              'Enviar Solicitud'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          ¿Ya tienes cuenta activa? <Link href="/auth/login" className="text-indigo-400 font-bold hover:underline">Iniciar Sesión</Link>
        </p>
      </div>
    </div>
  );
}
