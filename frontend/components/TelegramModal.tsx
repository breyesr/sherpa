'use client';

import { useState } from 'react';
import { X, Send, ExternalLink, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export default function TelegramModal({ isOpen, onClose, onSuccess, token }: TelegramModalProps) {
  const [step, setStep] = useState(1);
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/telegram/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bot_token: botToken })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save Telegram settings');
      }

      setStep(4); // Success step
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep(1);
        setBotToken('');
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
              I'm at @BotFather, next step
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
                  Once created, @BotFather will give you a "token" (it looks like <span className="font-mono">12345:ABC...</span>).
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
