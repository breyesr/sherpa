'use client';

import { useEffect } from 'react';

export default function GoogleSuccessPage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage('google_connected', window.location.origin);
      window.close();
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-green-100">
        <h1 className="text-2xl font-bold text-green-600 mb-2">Success!</h1>
        <p className="text-gray-600">Google Calendar connected. This window will close automatically.</p>
      </div>
    </div>
  );
}
