import { serverFetch } from '@/lib/api';
import ConversationsContent from './ConversationsContent';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ConversationsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('sherpa_token')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  let clients = [];
  try {
    const res = await serverFetch('/crm/clients');
    if (res.ok) {
      clients = await res.json();
    } else if (res.status === 401) {
      redirect('/auth/login');
    }
  } catch (err) {
    console.error('Failed to fetch clients for inbox:', err);
  }

  return <ConversationsContent initialClients={clients} />;
}
