import { serverFetch } from '@/lib/api';
import ClientCRM from './ClientCRM';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CRMPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('sherpa_token')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  let clients = [];
  let business = null;

  try {
    const [clientsRes, bizRes] = await Promise.all([
      serverFetch('/crm/clients'),
      serverFetch('/business/me')
    ]);

    if (clientsRes.ok) {
      clients = await clientsRes.json();
    } else if (clientsRes.status === 401) {
      redirect('/auth/login');
    }

    if (bizRes.ok) {
      business = await bizRes.json();
    }
  } catch (err) {
    console.error('Failed to fetch CRM data:', err);
  }

  return <ClientCRM initialClients={clients} initialBusiness={business} token={token} />;
}
