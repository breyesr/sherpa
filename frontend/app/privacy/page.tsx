import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Eye, Lock, Database, FileText, Mail, Info, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Xerpā Sales Intelligence',
  description: 'Conoce cómo recopilamos, usamos y protegemos tus datos en la plataforma Xerpā, incluyendo nuestra integración con WhatsApp Cloud API.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-100">
      {/* Premium Header with Gradients */}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-16 px-6 text-center text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-semibold mb-6 border border-indigo-500/30 backdrop-blur-sm">
            <Shield className="w-4 h-4" />
            <span>Centro de Confianza y Seguridad</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
            Política de Privacidad
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg md:text-xl font-medium">
            En Xerpā, tu privacidad es nuestra prioridad core. Conoce cómo gestionamos y protegemos la información de tu negocio.
          </p>
          <div className="mt-6 text-sm text-indigo-300 font-medium">
            Última actualización: 6 de agosto de 2026
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Quick Index / Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Índice Rápido</span>
              </h3>
              <nav className="space-y-3">
                <a href="#intro" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">1. Introducción</a>
                <a href="#recopilacion" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">2. Datos que recopilamos</a>
                <a href="#whatsapp" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">3. Integración de WhatsApp</a>
                <a href="#google" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">4. Integración de Google Calendar</a>
                <a href="#uso" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">5. Uso de la Información</a>
                <a href="#seguridad" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">6. Seguridad de Datos</a>
                <a href="#derechos" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">7. Tus Derechos</a>
                <a href="#contacto" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">8. Contacto</a>
              </nav>
              <div className="mt-8 pt-6 border-t border-slate-100">
                <Link 
                  href="/auth/login" 
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 px-4 text-center text-sm font-semibold text-white transition-all shadow-sm shadow-indigo-200"
                >
                  Regresar al Login
                </Link>
              </div>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Section 1: Intro */}
            <section id="intro" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Info className="w-5 h-5" />
                </div>
                <span>1. Introducción</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Xerpā (en adelante, &quot;la Plataforma&quot;) es una solución B2B de inteligencia de ventas diseñada para optimizar las visitas de campo de representantes comerciales a puntos de venta.
                </p>
                <p>
                  Esta Política de Privacidad describe nuestras prácticas con respecto a la recopilación, almacenamiento, uso y divulgación de los datos que nos proporcionas cuando utilizas nuestro sitio web, herramientas de integración de chat y servicios relacionados.
                </p>
              </div>
            </section>

            {/* Section 2: Collection */}
            <section id="recopilacion" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Eye className="w-5 h-5" />
                </div>
                <span>2. Datos que recopilamos</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Recopilamos información únicamente en la medida de lo necesario para prestar un servicio inteligente de B2B Sales CRM. Esto incluye:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 list-none pl-0">
                  <li className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Datos del Perfil Empresarial:</strong> 
                      Nombre de la empresa, correos electrónicos corporativos, número de contacto comercial.
                    </div>
                  </li>
                  <li className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Datos de Clientes y Puntos de Venta:</strong> 
                      Nombres, ubicaciones geográficas o códigos postales, historial de compras, objetivos comerciales.
                    </div>
                  </li>
                  <li className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Información de Agenda:</strong> 
                      Sincronización de eventos de calendarios asociados con las citas comerciales de los representantes.
                    </div>
                  </li>
                  <li className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Datos de Uso Técnico:</strong> 
                      Dirección IP, tipo de navegador, registros de auditoría y estadísticas de uso de APIs.
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 3: WhatsApp Integration */}
            <section id="whatsapp" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Database className="w-5 h-5" />
                </div>
                <span>3. Integración de WhatsApp Cloud API</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Nuestra plataforma se integra directamente con **Meta WhatsApp Cloud API** para automatizar el registro de información comercial (mensajes de distribuidores, prospectos o representantes de ventas) en el grafo de clientes.
                </p>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-sm">
                  <strong className="font-semibold block mb-1">Aviso Importante sobre WhatsApp:</strong>
                  Solo procesamos el contenido de los chats que sean enviados de forma explícita al número de WhatsApp de tu bot configurado. No leemos, interceptamos ni almacenamos comunicaciones ajenas a la plataforma. Toda la información enviada mediante esta API es procesada bajo las directrices estrictas de los términos de Meta Developer.
                </div>
              </div>
            </section>

            {/* Section 4: Google Calendar Integration */}
            <section id="google" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Database className="w-5 h-5" />
                </div>
                <span>4. Integración de Google Calendar</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Xerpā se integra con <strong>Google Calendar API</strong> para sincronizar la agenda de citas comerciales de los representantes de ventas. Esta integración es completamente opcional y requiere el consentimiento explícito del usuario mediante el flujo de autorización OAuth 2.0 de Google.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-6">Datos que accedemos</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Lectura de disponibilidad:</strong> Consultamos los eventos existentes en tu calendario principal para verificar la disponibilidad de horarios antes de agendar citas.</li>
                  <li><strong>Creación y edición de eventos:</strong> Creamos eventos en tu Google Calendar cuando se agenda una cita comercial desde la plataforma, y los actualizamos si la cita es reagendada o cancelada.</li>
                  <li><strong>Correo electrónico:</strong> Utilizamos tu dirección de correo electrónico asociada a tu cuenta de Google únicamente para identificarte dentro de la plataforma.</li>
                </ul>

                <h3 className="text-lg font-semibold text-slate-800 mt-6">Cómo usamos estos datos</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Los datos de calendario se utilizan <strong>exclusivamente</strong> para mostrar disponibilidad y gestionar citas comerciales dentro de Xerpā.</li>
                  <li><strong>No vendemos, compartimos ni transferimos</strong> tus datos de Google Calendar a terceros bajo ninguna circunstancia.</li>
                  <li><strong>No utilizamos</strong> los datos de Google Calendar para publicidad, retargeting ni ningún propósito de marketing.</li>
                  <li><strong>No permitimos</strong> que personas lean tus datos de calendario a menos que hayas dado tu consentimiento explícito, sea necesario por razones de seguridad o para cumplir con la ley aplicable.</li>
                </ul>

                <h3 className="text-lg font-semibold text-slate-800 mt-6">Revocación del acceso</h3>
                <p>
                  Puedes desconectar Google Calendar en cualquier momento desde la sección de <strong>Configuración → Integraciones</strong> dentro de Xerpā. También puedes revocar el acceso directamente desde tu cuenta de Google en:{' '}
                  <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800">myaccount.google.com/permissions</a>.
                </p>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-900 text-sm">
                  <strong className="font-semibold block mb-1">Cumplimiento con la Política de Datos de Google:</strong>
                  El uso y la transferencia a cualquier otra aplicación de la información recibida de las APIs de Google por parte de Xerpā se adhiere a la{' '}
                  <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">Política de Datos de Usuario de Google API Services</a>, incluyendo los requisitos de Uso Limitado (Limited Use).
                </div>
              </div>
            </section>

            {/* Section 5: Usage */}
            <section id="uso" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Lock className="w-5 h-5" />
                </div>
                <span>5. Uso de la Información</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  La información recopilada se utiliza exclusivamente para:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Proporcionar resúmenes inteligentes de preparación de visitas comerciales (&quot;briefings&quot;).</li>
                  <li>Categorizar automáticamente los mensajes comerciales en oportunidades, pedidos o reportes mediante el motor GraphRAG de IA.</li>
                  <li>Mantener sincronizada tu agenda de Google Calendar o herramientas de calendario compatibles.</li>
                  <li>Prevenir abusos, fraudes y monitorear la salud operacional del sistema.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Security */}
            <section id="seguridad" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Shield className="w-5 h-5" />
                </div>
                <span>6. Seguridad de los Datos</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Toda la información se transfiere utilizando encriptación HTTPS/TLS de grado bancario. Las bases de datos se almacenan en servidores con acceso controlado y robustas políticas de aislamiento lógico.
                </p>
                <p>
                  Garantizamos que **nunca venderemos, alquilaremos ni compartiremos** la información de tu negocio ni los contactos comerciales de tus clientes con terceras partes para fines de mercadotecnia.
                </p>
              </div>
            </section>

            {/* Section 6: Rights */}
            <section id="derechos" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span>7. Derechos ARCO</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Como titular de los datos, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (Derechos ARCO) al procesamiento de tu información comercial. Puedes retirar tu consentimiento para la integración de WhatsApp o Google Calendar en cualquier momento desde el panel de integraciones.
                </p>
              </div>
            </section>

            {/* Section 7: Contact */}
            <section id="contacto" className="p-8 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <span>8. Contacto e Información Legal</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Si tienes dudas o deseas solicitar la eliminación completa de los datos de tu cuenta en Xerpā, puedes contactarnos en:
                </p>
                <p className="flex items-center gap-2 text-indigo-700 font-semibold bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 max-w-sm">
                  <Mail className="w-5 h-5" />
                  <span>hello@xerpaa.com</span>
                </p>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <div className="max-w-6xl mx-auto px-6">
          <p>© {new Date().getFullYear()} Xerpā Sales Intelligence. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
