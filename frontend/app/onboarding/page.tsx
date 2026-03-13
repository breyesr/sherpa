'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/config';

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
  const [assistantName, setAssistantName] = useState('Sherpa Assistant');
  const [assistantTone, setAssistantTone] = useState('Professional');
  const [greeting, setGreeting] = useState('Hello! How can I help you today?');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [busySlots, setBusySlots] = useState<any[]>([]);

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

  const handleNext = () => setStep(step + 1);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Step 1: Business Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="My Business"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="e.g. Health, Law, Beauty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="+123456789"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Step 2: Assistant Setup</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assistant Name</label>
              <input
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tone</label>
              <select
                value={assistantTone}
                onChange={(e) => setAssistantTone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              >
                <option>Professional</option>
                <option>Friendly</option>
                <option>Formal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Welcome Message</label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                rows={3}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Step 3: Connect Google Calendar</h2>
            <p className="text-gray-600 italic">This will allow the assistant to check your availability.</p>
            <div className={`p-6 border rounded-md text-center ${isGoogleConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              {isGoogleConnected ? (
                <div className="space-y-4">
                   <p className="text-green-700 font-bold text-lg">✅ Google Calendar Connected!</p>
                   <button 
                     onClick={handleCheckAvailability}
                     className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                   >
                     Test: Check Availability
                   </button>
                   {busySlots.length > 0 && (
                     <div className="text-left text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                       <p className="font-bold mb-1">Found {busySlots.length} busy slots:</p>
                       {busySlots.map((slot, i) => (
                         <div key={i}>{new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleTimeString()}</div>
                       ))}
                     </div>
                   )}
                </div>
              ) : (
                <button 
                  onClick={handleGoogleConnect}
                  className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                  Connect Google Account
                </button>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Step 4: Connect WhatsApp</h2>
            <p className="text-gray-600 italic">WhatsApp Meta Cloud API integration will be available in the next phase.</p>
            <div className="p-4 bg-gray-50 border rounded-md text-sm">
              <p>Manual integration guide will be provided here.</p>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold">Step 5: Almost Ready!</h2>
            <p className="text-gray-600">You are about to activate your 30-day free trial.</p>
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
              <ul className="text-left text-sm space-y-2 text-blue-800">
                <li>✅ Unlimited clients</li>
                <li>✅ WhatsApp Auto-responses</li>
                <li>✅ Google Calendar Sync</li>
              </ul>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Onboarding</h1>
            <p className="text-xs text-gray-500">Step {step} of 5</p>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-gray-600 font-medium"
          >
            Skip for now
          </button>
        </div>

        {error && <p className="mb-4 text-red-600 text-center text-sm bg-red-50 p-2 rounded">{error}</p>}

        <div className="mb-8 min-h-[300px]">
          {renderStep()}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={step === 1 || loading}
            className={`px-6 py-2 rounded-md ${step === 1 ? 'invisible' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Back
          </button>
          
          {step < 5 ? (
            <button
              onClick={handleNext}
              className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Finish & Activate Trial'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
