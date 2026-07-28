'use client';

import { useAuthStore } from '@/store/authStore';
import ServiceCatalog from '@/app/settings/components/ServiceCatalog';
import { useState } from 'react';

export default function ServicesPage() {
  const token = useAuthStore((state) => state.token);
  const [toast, setToast] = useState<{type: string, text: string} | null>(null);

  const showToast = (msg: {type: string, text: string}) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border transition-all ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.text}
        </div>
      )}
      <ServiceCatalog 
        token={token} 
        onMessage={showToast} 
      />
    </div>
  );
}
