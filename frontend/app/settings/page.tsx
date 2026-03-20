import { serverFetch } from '@/lib/api';
import SettingsContent from './SettingsContent';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('sherpa_token')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  let business = null;
  let user = null;

  try {
    const [busRes, userRes] = await Promise.all([
      serverFetch('/business/me'),
      serverFetch('/auth/me')
    ]);

    if (busRes.ok) business = await busRes.json();
    if (userRes.ok) user = await userRes.json();

    if (busRes.status === 401) {
      redirect('/auth/login');
    }
  } catch (err) {
    console.error('Failed to fetch settings data:', err);
  }

  return (
    <SettingsContent 
      initialBusiness={business} 
      initialUser={user} 
      token={token} 
    />
  );
}
