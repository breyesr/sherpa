'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProspectsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/trade/prospects/accounts');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
    </div>
  );
}
