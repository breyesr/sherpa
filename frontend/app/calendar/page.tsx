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

  let shouldRedirectToOnboarding = false;

  try {
    const [aptRes, busyRes, bizRes] = await Promise.all([
      serverFetch('/crm/appointments'),
      serverFetch('/integrations/google/availability'),
      serverFetch('/business/me')
    ]);

    if (bizRes.status === 404) {
      shouldRedirectToOnboarding = true;
    } else {
      if (aptRes.ok) appointments = await aptRes.json();
      if (busyRes.ok) {
        const data = await busyRes.json();
        busySlots = data.busy_slots || [];
      }
      if (bizRes.ok) {
        business = await bizRes.json();
        const features = business?.features_config || {};
        const showServices = features.services?.enabled ?? (business?.vertical_type === 'BASIC');
        const showSalesIntel = features.sales_intelligence?.enabled ?? (business?.vertical_type === 'TRADE');
        const showScheduling = showServices || showSalesIntel;

        if (!showScheduling) {
          redirect('/');
        }
      }
    }

    if (aptRes.status === 401) {
      redirect('/auth/login');
    }
  } catch (err) {
    console.error('Failed to fetch calendar data:', err);
  }

  if (shouldRedirectToOnboarding) {
    redirect('/onboarding');
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
