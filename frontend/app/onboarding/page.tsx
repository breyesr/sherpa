'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/config';
import { Info, Loader2 } from 'lucide-react';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Monterrey', label: 'Monterrey' },
  { value: 'America/Tijuana', label: 'Tijuana' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [assistantName, setAssistantName] = useState('Sherpa Assistant');
  const [assistantTone, setAssistantTone] = useState('Professional');
  const [greeting, setGreeting] = useState('Hello! How can I help you today?');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [busySlots, setBusySlots] = useState<any[]>([]);

  // Validation: Step 1 is mandatory
  const isStep1Complete = businessName.trim() !== '' && category.trim() !== '' && phone.trim() !== '';

  useEffect(() => {
    if (!token) {
      router.push('/auth/login');
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data === 'google_connected') {
        setIsGoogleConnected(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [token, router]);

  const handleCheckAvailability = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/google/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setBusySlots(data.busy_slots || []);
    } catch (err) {
      setError('Failed to fetch availability');
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/google/authorize`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.open(data.authorization_url, 'Connect Google Calendar', 'width=600,height=700');
      }
    } catch (err) {
      setError('Failed to initiate Google connection');
    }
  };

  const handleNext = () => {
    if (step === 1 && !isStep1Complete) return;
    setStep(step + 1);
  };
  
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const businessRes = await fetch(`${API_BASE_URL}/business/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: businessName,
          category: category,
          contact_phone: phone,
          timezone: timezone,
        }),
      });

      if (!businessRes.ok) throw new Error('Failed to create business profile');

      const assistantRes = await fetch(`${API_BASE_URL}/business/me/assistant`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: assistantName,
          tone: assistantTone,
          greeting: greeting,
        }),
      });

      if (!assistantRes.ok) throw new Error('Failed to update assistant configuration');

      const trialRes = await fetch(`${API_BASE_URL}/business/me/activate-trial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!trialRes.ok) throw new Error('Failed to activate trial');

      router.push('/');
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setError(err.message || 'An unexpected error occurred during onboarding');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-gray-900">Let's start with the basics</h2>
              <p className="text-gray-500 text-sm font-medium">We need this to set up your business identity.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Business Name *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Acme Health"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Industry Category *</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Wellness Clinic"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Contact Phone *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Timezone *</label>
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-gray-400 italic">* Required to create your profile</p>
            </div>
          </div>
        );
      case 2:
      case 3:
      case 4:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  {step === 2 ? 'Customize your AI' : step === 3 ? 'Sync Calendar' : 'Connect WhatsApp'}
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                  {step === 2 ? 'Define how your assistant speaks to clients.' : 'Check availability automatically.'}
                </p>
              </div>
              <button 
                onClick={handleNext}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Skip for now
              </button>
            </div>
            
            {/* Step-specific content (Assistant, Google, WhatsApp) */}
            <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 border-dashed">
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Assistant Name</label>
                    <input type="text" value={assistantName} onChange={(e) => setAssistantName(e.target.value)} className="w-full p-3 bg-white border border-gray-100 rounded-2xl outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Greeting</label>
                    <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} className="w-full p-3 bg-white border border-gray-100 rounded-2xl outline-none" rows={2} />
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="text-center py-4">
                   <button onClick={handleGoogleConnect} className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-2xl flex items-center gap-2 mx-auto hover:bg-blue-50 transition-all">
                      Connect Google
                   </button>
                </div>
              )}
              {step === 4 && (
                <div className="text-center py-4 text-gray-400 text-sm italic">
                   Integration coming soon. You can skip this step.
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl flex gap-3 items-center">
              <Info size={18} className="text-blue-500 shrink-0" />
              <p className="text-[11px] text-blue-700 leading-tight">
                Don't worry, you can always finish this later in <b>Settings {'>'} Integrations</b>.
              </p>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center">Everything set!</h2>
              <p className="text-gray-500 font-medium">Ready to start your 30-day free trial.</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl text-white shadow-lg space-y-4">
              <div className="text-left space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">✓</span> Unlimited Appointments</div>
                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">✓</span> AI Smart Scheduling</div>
                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">✓</span> Automated Reminders</div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-[40px] shadow-sm border border-gray-100 p-10 space-y-8 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-center text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <div className="min-h-[380px] animate-in fade-in slide-in-from-bottom-2 duration-500">
          {renderStep()}
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-50">
          <button
            onClick={handleBack}
            disabled={step === 1 || loading}
            className={`font-bold text-sm px-4 py-2 transition-all ${step === 1 ? 'invisible' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Go Back
          </button>
          
          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && !isStep1Complete}
              className={`px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                (step === 1 && !isStep1Complete) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-10 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              Start My Free Trial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
