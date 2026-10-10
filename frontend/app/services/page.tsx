'use client';

import { useAuthStore } from '@/store/authStore';
import ServiceCatalog from '@/app/settings/components/ServiceCatalog';

export default function ServicesPage() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="space-y-6">
      <ServiceCatalog token={token} />
    </div>
  );
}
