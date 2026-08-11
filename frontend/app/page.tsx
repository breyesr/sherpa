import { serverFetch } from '@/lib/api';
import DashboardHome from './DashboardHome';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = cookies();
  const token = cookieStore.get('sherpa_token')?.value;

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 bg-gray-50">
        <div className="max-w-2xl w-full text-center space-y-8 bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-5xl sm:text-6xl font-black text-indigo-600 tracking-tight">Xerpā</h1>
          <p className="text-xl sm:text-2xl text-slate-700 font-bold">
            B2B Sales Intelligence & Calendar Synchronization
          </p>
          <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            Xerpā es una plataforma inteligente de ventas B2B que optimiza la gestión de visitas de representantes de campo, automatiza reportes comerciales y mantiene las citas perfectamente sincronizadas mediante Google Calendar.
          </p>
          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/login" 
              className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-lg"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/auth/register" 
              className="px-10 py-4 border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all active:scale-95 text-lg"
            >
              Probar Gratis
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let business = null;
  let stats = {
    total_clients: 0,
    total_appointments: 0,
    today_appointments: 0,
    flagged_clients: 0,
    upcoming: []
  };

  let shouldRedirectToOnboarding = false;

  try {
    const [busRes, statsRes] = await Promise.all([
      serverFetch('/business/me'),
      serverFetch('/business/stats')
    ]);

    if (busRes.status === 404) {
      shouldRedirectToOnboarding = true;
    } else {
      if (busRes.ok) business = await busRes.json();
      if (statsRes.ok) stats = await statsRes.json();
    }
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err);
  }

  if (shouldRedirectToOnboarding) {
    redirect('/onboarding');
  }

  return (
    <DashboardHome 
      initialBusiness={business} 
      initialStats={stats} 
      token={token} 
    />
  );
}
