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
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-2xl font-black text-indigo-600">Xerpa</span>
            <div className="flex items-center gap-3">
              <Link 
                href="/auth/login" 
                className="px-5 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link 
                href="/auth/register" 
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Xerpa
            </h1>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-indigo-600">
              Sales Intelligence
            </p>
            <p className="mt-4 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Xerpa is a B2B Sales Intelligence platform that empowers field sales representatives with data-driven account insights, automated visit planning, and seamless calendar synchronization through Google Calendar.
            </p>
            <p className="mt-3 text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Xerpa es una plataforma inteligente de ventas B2B que optimiza la gestión de visitas de representantes de campo, automatiza reportes comerciales y mantiene las citas perfectamente sincronizadas mediante Google Calendar.
            </p>
          </div>
        </header>

        {/* Features Section */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Google Calendar Sync</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Two-way calendar synchronization keeps your field visit appointments perfectly aligned with your Google Calendar.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sales Analytics</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Track visit performance, client engagement metrics, and sales pipeline health with real-time dashboards.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Messaging Integration</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Automate client communication through WhatsApp and Telegram to streamline follow-ups and appointment confirmations.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Route Planning</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Optimize daily field visit routes for your sales team based on client priority, location, and appointment schedules.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-white border-t border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
              How Xerpa Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="font-bold text-gray-900 mb-2">Connect Your Accounts</h3>
                <p className="text-sm text-slate-500">Link your Google Calendar and messaging platforms to centralize your sales workflow in one place.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="font-bold text-gray-900 mb-2">Plan Your Visits</h3>
                <p className="text-sm text-slate-500">Create and schedule field visits with intelligent route suggestions and automatic calendar sync.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="font-bold text-gray-900 mb-2">Grow Your Sales</h3>
                <p className="text-sm text-slate-500">Leverage data-driven insights and automated reports to improve client engagement and close more deals.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
            Trusted Integrations
          </h2>
          <p className="text-center text-slate-500 max-w-2xl mx-auto mb-10">
            Xerpa integrates with industry-leading platforms to provide a seamless experience for your sales operations.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span className="font-semibold text-gray-800">Google Calendar</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.486l4.604-1.207A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.153 0-4.144-.68-5.778-1.835l-.412-.262-2.732.717.73-2.668-.287-.433A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              <span className="font-semibold text-gray-800">WhatsApp Cloud API</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              <span className="font-semibold text-gray-800">Telegram</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Xerpa Sales Intelligence. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </div>
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
