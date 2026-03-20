import { serverFetch } from '@/lib/api';
import ClientCalendar from './ClientCalendar';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CalendarPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('sherpa_token')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  let appointments = [];
  let busySlots = [];
  let business = null;

  try {
    const [aptRes, busyRes, bizRes] = await Promise.all([
      serverFetch('/crm/appointments'),
      serverFetch('/integrations/google/availability'),
      serverFetch('/business/me')
    ]);

    if (aptRes.ok) appointments = await aptRes.json();
    if (busyRes.ok) {
      const data = await busyRes.json();
      busySlots = data.busy_slots || [];
    }
    if (bizRes.ok) business = await bizRes.json();

    if (aptRes.status === 401) {
      redirect('/auth/login');
    }
  } catch (err) {
    console.error('Failed to fetch calendar data:', err);
  }

  return (
    <ClientCalendar 
      initialAppointments={appointments} 
      initialBusySlots={busySlots} 
      token={token}
      timezone={business?.timezone || 'UTC'}
    />
  );
}
