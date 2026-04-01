'use client';

import { useState } from 'react';
import { X, ShieldCheck, ExternalLink, CheckCircle2, ChevronRight, Smartphone, MessageSquare, Copy, Check } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export default function WhatsAppModal({ isOpen, onClose, onSuccess, token }: WhatsAppModalProps) {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Number, 3: Verify, 4: Success
  const [businessNumber, setBusinessNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          business_number: businessNumber
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to link your number');
      }

      setStep(4);
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep(1);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 text-left animate-in fade-in duration-300">
            <h3 className="font-bold text-lg text-gray-900">Connect in seconds</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Sherpa uses its own global infrastructure to connect your WhatsApp. You don't need any complex accounts or API keys.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <CheckCircle2 size={18} className="text-blue-600" />
                <p className="text-sm font-bold text-blue-900">Zero Technical Knowledge required</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <CheckCircle2 size={18} className="text-blue-600" />
                <p className="text-sm font-bold text-blue-900">No Twilio or Meta accounts needed</p>
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
            >
              Let's Start <ChevronRight size={18} />
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 text-left animate-in slide-in-from-right-4 duration-300">
            <h3 className="font-bold text-lg text-gray-900">What's your number?</h3>
            <p className="text-gray-600 text-sm">Enter the phone number you'll use for your business.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">WhatsApp Number</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold"
                  placeholder="+1 234 567 890"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Back</button>
              <button 
                disabled={!businessNumber}
                onClick={() => setStep(3)}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 text-left animate-in slide-in-from-right-4 duration-300">
            <h3 className="font-bold text-lg text-gray-900">Final Step: Verification</h3>
            <p className="text-gray-600 text-sm">Send this exact code from your WhatsApp to our master number to link your account.</p>
            
            <div className="bg-gray-900 text-white p-6 rounded-[2rem] space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MessageSquare size={100} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Send this code</p>
                  <button onClick={() => handleCopy('join flower-leaf')} className="text-gray-400 hover:text-white transition-colors">
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-3xl font-black tracking-tighter">join flower-leaf</p>
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">To this number</p>
                  <p className="text-lg font-bold">+1 415 523 8886</p>
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl font-medium border border-red-100">{error}</p>}
            
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Back</button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : "I've sent the code"}
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="text-center py-12 space-y-4 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Connected!</h2>
            <p className="text-gray-500 font-medium">Your WhatsApp number is now managed by Sherpa.</p>
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
              <p className="text-green-700 text-xs font-bold uppercase tracking-widest">Business API Wizard</p>
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
