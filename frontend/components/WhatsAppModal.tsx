'use client';

import { useState } from 'react';
import { X, ShieldCheck, ExternalLink, CheckCircle2, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export default function WhatsAppModal({ isOpen, onClose, onSuccess, token }: WhatsAppModalProps) {
  const [step, setStep] = useState(1);
  const [accessToken, setAccessToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [verifyToken] = useState('sherpa_v1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          access_token: accessToken,
          phone_number_id: phoneId,
          business_account_id: accountId,
          verify_token: verifyToken
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save WhatsApp settings');
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
          <div className="space-y-6 text-left">
            <h3 className="font-bold text-lg text-gray-900">Step 1: Meta Developer Account</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              To use WhatsApp, you need a Meta Developer account. It's free and takes 5 minutes to set up.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-6 h-6 bg-white border rounded flex items-center justify-center shrink-0 text-xs font-bold text-gray-400">1</div>
                <p className="text-sm text-gray-700">Go to <b>developers.facebook.com</b> and create an account.</p>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-6 h-6 bg-white border rounded flex items-center justify-center shrink-0 text-xs font-bold text-gray-400">2</div>
                <p className="text-sm text-gray-700">Create a new <b>"Other"</b> app and select <b>"Business"</b> type.</p>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-6 h-6 bg-white border rounded flex items-center justify-center shrink-0 text-xs font-bold text-gray-400">3</div>
                <p className="text-sm text-gray-700">Add <b>"WhatsApp"</b> to your app from the dashboard.</p>
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              I have my Meta App ready <ChevronRight size={18} />
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 text-left">
            <h3 className="font-bold text-lg text-gray-900">Step 2: WhatsApp Credentials</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Find these in the <b>WhatsApp {'\u003E'} API Setup</b> section of your Meta App.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Phone Number ID</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. 1092837465..."
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Business Account ID</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. 29384756..."
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200"
              >
                Back
              </button>
              <button 
                disabled={!phoneId || !accountId}
                onClick={() => setStep(3)}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-md"
              >
                Next Step
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 text-left">
            <h3 className="font-bold text-lg text-gray-900">Step 3: Access Token</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Enter your <b>Permanent Access Token</b>. This ensures your assistant stays connected forever.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">System User Access Token</label>
                <textarea 
                  rows={3}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono text-xs"
                  placeholder="EAAG..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-blue-800 text-xs font-bold uppercase mb-1">Webhook Configuration</p>
                <p className="text-blue-700 text-xs mb-2">Set these in the <b>WhatsApp > Configuration</b> tab:</p>
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-900"><b>CALLBACK URL:</b> https://your-domain.com/api/v1/whatsapp/webhook</p>
                  <p className="text-[10px] text-blue-900"><b>VERIFY TOKEN:</b> {verifyToken}</p>
                </div>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl font-medium border border-red-100">{error}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Back
              </button>
              <button 
                disabled={!accessToken || loading}
                onClick={handleSubmit}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Finalizing...' : 'Complete Connection'}
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">WhatsApp Live!</h2>
            <p className="text-gray-500">Your AI assistant is now ready to handle real WhatsApp messages.</p>
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
