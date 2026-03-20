import { serverFetch } from '@/lib/api';
import DashboardHome from './DashboardHome';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function Home() {
  const cookieStore = cookies();
  const token = cookieStore.get('sherpa_token')?.value;

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <div className="max-w-2xl w-full text-center space-y-8 bg-white p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-6xl font-extrabold text-blue-600 tracking-tight">Sherpa</h1>
          <p className="text-2xl text-gray-500 font-medium italic">"Scheduling made simple."</p>
          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/login" 
              className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-lg"
            >
              Login
            </Link>
            <Link 
              href="/auth/register" 
              className="px-10 py-4 border-2 border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 text-lg"
            >
              Try for Free
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
    upcoming: []
  };

  try {
    const [busRes, statsRes] = await Promise.all([
      serverFetch('/business/me'),
      serverFetch('/business/stats')
    ]);

    if (busRes.ok) business = await busRes.json();
    if (statsRes.ok) stats = await statsRes.json();
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err);
  }

  return (
    <DashboardHome 
      initialBusiness={business} 
      initialStats={stats} 
      token={token} 
    />
  );
}
