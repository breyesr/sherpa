import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, FileText, Scale, UserCheck, AlertTriangle, HelpCircle, Mail, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos de Servicio | Xerpa Sales Intelligence',
  description: 'Consulta los términos y condiciones de uso de la plataforma Xerpa.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-100">
      {/* Premium Header with Gradients */}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-16 px-6 text-center text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-semibold mb-6 border border-indigo-500/30 backdrop-blur-sm">
            <Scale className="w-4 h-4" />
            <span>Acuerdo Legal y de Uso</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
            Términos de Servicio
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg md:text-xl font-medium">
            Por favor, lee detalladamente los términos de servicio que regulan el uso de la plataforma Xerpa.
          </p>
          <div className="mt-6 text-sm text-indigo-300 font-medium">
            Última actualización: 10 de agosto de 2026
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
                <a href="#aceptacion" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">1. Aceptación</a>
                <a href="#descripcion" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">2. Descripción</a>
                <a href="#integraciones" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">3. Integraciones de Terceros</a>
                <a href="#responsabilidades" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">4. Responsabilidades</a>
                <a href="#propiedad" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">5. Propiedad Intelectual</a>
                <a href="#limitacion" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">6. Limitación de Responsabilidad</a>
                <a href="#modificacion" className="block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">7. Modificaciones</a>
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
            
            {/* Section 1: Acceptance */}
            <section id="aceptacion" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span>1. Aceptación de los Términos</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Al acceder o utilizar la plataforma Xerpa (en adelante, &quot;el Servicio&quot;), usted acepta estar sujeto a estos Términos de Servicio y a todas las leyes y regulaciones aplicables. Si no está de acuerdo con alguno de estos términos, tiene estrictamente prohibido utilizar o acceder a este sitio y sus aplicaciones.
                </p>
              </div>
            </section>

            {/* Section 2: Description */}
            <section id="descripcion" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span>2. Descripción del Servicio</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Xerpa es una plataforma de inteligencia de ventas B2B que recopila, estructura y procesa datos para optimizar la planificación de rutas y visitas de campo de representantes comerciales a puntos de venta, integrando automatizaciones mediante GraphRAG y flujos de mensajería comercial.
                </p>
              </div>
            </section>

            {/* Section 3: Third Party Integrations */}
            <section id="integraciones" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Shield className="w-5 h-5" />
                </div>
                <span>3. Integraciones y Servicios de Terceros</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  El Servicio permite la conexión voluntaria con plataformas externas para potenciar su funcionalidad:
                </p>
                <ul className="grid grid-cols-1 gap-4 my-4 list-none pl-0">
                  <li className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Google Calendar:</strong> 
                      Al conectar su cuenta de Google, Xerpa tendrá acceso de lectura y escritura a su calendario con el único fin de sincronizar, reprogramar o crear eventos de visitas comerciales. El uso de los datos obtenidos a través de la API de Google cumple estrictamente con las directrices de la Política de Datos de Google y el principio de &quot;Uso Limitado&quot;.
                    </div>
                  </li>
                  <li className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Meta WhatsApp Cloud API:</strong> 
                      Al conectar su número a través de la integración de Meta, usted acepta los términos comerciales de Meta WhatsApp. El uso de esta API está destinado exclusivamente al envío y recepción de mensajes transaccionales y de seguimiento autorizados por sus clientes comerciales.
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4: Responsibilities */}
            <section id="responsabilidades" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span>4. Responsabilidades del Usuario</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Como usuario del Servicio, usted se compromete a:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Proporcionar información verídica, exacta y actualizada durante el registro.</li>
                  <li>Mantener la seguridad de su contraseña y credenciales de acceso.</li>
                  <li>No utilizar el servicio para enviar spam, mensajes no solicitados o contenido que infrinja políticas de Meta o Google.</li>
                  <li>Contar con el consentimiento expreso de sus clientes finales y representantes comerciales para procesar su información de contacto y ubicación física.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Intellectual Property */}
            <section id="propiedad" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <span>5. Propiedad Intelectual</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Todo el software, diseño, logotipos, código fuente y material intelectual asociado con Xerpa son propiedad exclusiva de Xerpa o de sus licenciantes. Queda prohibida la reproducción, modificación o ingeniería inversa del software sin consentimiento previo por escrito.
                </p>
              </div>
            </section>

            {/* Section 6: Limitation of Liability */}
            <section id="limitacion" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span>6. Limitación de Responsabilidad</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  En ningún caso Xerpa será responsable de daños indirectos, incidentales, especiales o consecuentes (incluyendo pérdida de ganancias, datos o interrupción del negocio) que surjan del uso o la imposibilidad de uso del Servicio, incluso si Xerpa ha sido notificado de la posibilidad de tales daños.
                </p>
              </div>
            </section>

            {/* Section 7: Modifications */}
            <section id="modificacion" className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Scale className="w-5 h-5" />
                </div>
                <span>7. Modificaciones a los Términos</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Xerpa se reserva el derecho de revisar y modificar estos Términos de Servicio en cualquier momento sin previo aviso. Al continuar utilizando la Plataforma, usted acepta estar sujeto a la versión vigente en ese momento de estos Términos de Servicio.
                </p>
              </div>
            </section>

            {/* Section 8: Contact */}
            <section id="contacto" className="p-8 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-slate-200/80 shadow-sm scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <span>8. Contacto e Información Legal</span>
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                <p>
                  Si tiene preguntas o dudas sobre estos Términos de Servicio, puede comunicarse con nosotros en:
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
          <p>© {new Date().getFullYear()} Xerpa Sales Intelligence. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
