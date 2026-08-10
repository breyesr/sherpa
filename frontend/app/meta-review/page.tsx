'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { MessageSquare, Send, CheckCircle2, XCircle, Loader2, Info, ArrowLeft, Shield, FileText, PlusCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface WhatsAppStatusResponse {
  status: string;
  provider_type?: string;
  phone_number?: string;
  twilio_from_number?: string;
  is_sandbox?: boolean;
  checked_at?: string;
  error_message?: string;
}

interface MetaTemplate {
  name: string;
  status: string;
  language: string;
  category: string;
}

interface TemplateCreateResponse {
  id: string;
  status: string;
  category: string;
}

export default function MetaReviewPage() {
  const [activeTab, setActiveTab] = useState<'messaging' | 'templates'>('messaging');

  // State for Video 1 (Messaging)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'template'>('template');
  const [messageText, setMessageText] = useState('Hola, esta es una prueba de envío de WhatsApp desde Xerpā para el proceso de Meta App Review.');
  const [templateName, setTemplateName] = useState('hello_world');
  const [language, setLanguage] = useState('en_US');

  // State for Video 2 (Templates)
  const [newTemplateName, setNewTemplateName] = useState('xerpa_test_template');
  const [newTemplateCategory, setNewTemplateCategory] = useState('UTILITY');
  const [newTemplateLang, setNewTemplateLang] = useState('es_MX');
  const [newTemplateBody, setNewTemplateBody] = useState('Hola {{1}}, tu código de verificación para ingresar a Xerpā es {{2}}.');
  const [createdTemplate, setCreatedTemplate] = useState<TemplateCreateResponse | null>(null);

  // Query to get current integration status
  const { data: status, isLoading: isLoadingStatus, refetch } = useQuery<WhatsAppStatusResponse>({
    queryKey: ['whatsappStatus'],
    queryFn: () => apiClient.get<WhatsAppStatusResponse>('/whatsapp/status'),
  });

  const isConnected = status?.status === 'connected';

  // Query to get templates list from Meta
  const { data: templates = [], isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery<MetaTemplate[]>({
    queryKey: ['metaTemplates'],
    queryFn: () => apiClient.get<MetaTemplate[]>('/whatsapp/templates'),
    enabled: isConnected,
  });

  // Auto-set the first template in the selector when loaded
  useEffect(() => {
    if (templates.length > 0) {
      // Find an approved template if possible, otherwise first
      const approved = templates.find(t => t.status === 'APPROVED');
      if (approved) {
        setTemplateName(approved.name);
        setLanguage(approved.language);
      } else {
        setTemplateName(templates[0].name);
        setLanguage(templates[0].language);
      }
    }
  }, [templates]);

  // Mutation to send test message
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        to_number: phoneNumber.trim(),
        message: messageText,
        template_name: messageType === 'template' ? templateName : null,
        language: messageType === 'template' ? language : null,
      };
      return apiClient.post('/whatsapp/test-send', payload);
    },
    onSuccess: () => {
      toast.success('¡Mensaje enviado con éxito!');
    },
    onError: (error: any) => {
      console.error(error);
      const detail = error?.response?.data?.detail || 'Error al enviar el mensaje de prueba.';
      toast.error(detail);
    }
  });

  // Mutation to create message template
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: newTemplateName.trim().toLowerCase().replace(/\s+/g, '_'),
        category: newTemplateCategory,
        body_text: newTemplateBody,
        language: newTemplateLang,
      };
      return apiClient.post<TemplateCreateResponse>('/whatsapp/test-template', payload);
    },
    onSuccess: (data) => {
      setCreatedTemplate(data);
      toast.success('¡Plantilla de mensaje creada en Meta!');
      refetchTemplates(); // Auto refetch templates list
    },
    onError: (error: any) => {
      console.error(error);
      const detail = error?.response?.data?.detail || 'Error al crear la plantilla de mensaje.';
      toast.error(detail);
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Por favor ingresa un número de teléfono válido.');
      return;
    }
    sendTestMutation.mutate();
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName) {
      toast.error('Por favor ingresa un nombre para la plantilla.');
      return;
    }
    if (!newTemplateBody) {
      toast.error('Por favor ingresa el cuerpo del mensaje de la plantilla.');
      return;
    }
    createTemplateMutation.mutate();
  };

  const activeProvider = status?.provider_type === 'meta_cloud_api' ? 'Meta Cloud API' : 'Twilio / Platform';

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold mb-1">
            <Shield size={16} className="text-blue-600" />
            <span>Herramienta de Diagnóstico Autorizada</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meta Integration Review Console</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Valida la conectividad de la aplicación de Meta en vivo y genera evidencias para App Review.
          </p>
        </div>
        <Link 
          href="/settings"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200/80 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-center"
        >
          <ArrowLeft size={14} />
          Volver a Configuración
        </Link>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('messaging')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'messaging'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Video 1: Enviar Mensajes</span>
          </div>
          {activeTab === 'messaging' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'templates'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} />
            <span>Video 2: Crear Plantilla</span>
          </div>
          {activeTab === 'templates' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Status Card and instructions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status Card */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Estado del Canal</h2>
            
            {isLoadingStatus ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm text-slate-500 font-medium">Verificando conexión...</span>
              </div>
            ) : isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl border border-emerald-100 text-sm font-bold">
                  <CheckCircle2 size={18} />
                  <span>Canal Activo y Conectado</span>
                </div>
                
                <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Proveedor:</span>
                    <span>{activeProvider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Número Remitente:</span>
                    <span className="font-mono">{status?.phone_number || status?.twilio_from_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Último Check:</span>
                    <span className="text-[10px] text-slate-500">
                      {status?.checked_at ? new Date(status.checked_at).toLocaleTimeString() : 'Recientemente'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 bg-rose-50 text-rose-700 px-4 py-3 rounded-2xl border border-rose-100 text-sm font-bold">
                  <XCircle size={18} />
                  <span>Desconectado</span>
                </div>
                <p className="text-xs text-rose-500 font-medium leading-relaxed">
                  {status?.error_message || 'Debes configurar una integración de WhatsApp activa en la sección de integraciones.'}
                </p>
              </div>
            )}
            
            <button 
              onClick={() => { refetch(); refetchTemplates(); }}
              className="w-full text-center py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 transition-colors"
            >
              Actualizar Diagnóstico
            </button>
          </div>

          {/* Instructions Box */}
          <div className="bg-slate-900 text-slate-300 rounded-[2rem] p-6 space-y-4 shadow-md">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Info size={14} className="text-blue-400" />
              Instrucciones de Grabación
            </h2>
            {activeTab === 'messaging' ? (
              <div className="text-xs space-y-3 leading-relaxed">
                <p><strong>Meta Permiso:</strong> <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">whatsapp_business_messaging</code></p>
                <p>1. Graba tu pantalla mostrando esta página de Xerpā junto a una ventana de WhatsApp Web en el otro lado.</p>
                <p>2. Ingresa tu número de teléfono móvil personal.</p>
                <p>3. Selecciona una de tus **Plantillas Aprobadas** de la lista (por ejemplo, `xerpa_bienvenida`).</p>
                <p>4. Presiona <strong>Enviar Mensaje de Prueba</strong> y muestra cómo llega al instante a tu celular.</p>
              </div>
            ) : (
              <div className="text-xs space-y-3 leading-relaxed">
                <p><strong>Meta Permiso:</strong> <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">whatsapp_business_management</code></p>
                <p>1. Inicia la grabación enfocando este formulario.</p>
                <p>2. Define un nombre para tu nueva plantilla de pruebas (letras minúsculas y guiones bajos).</p>
                <p>3. Selecciona la categoría <strong>MARKETING</strong> e ingresa un mensaje de cuerpo de ejemplo sin variables al inicio/fin.</p>
                <p>4. Haz clic en <strong>Crear Plantilla Oficial</strong>.</p>
                <p>5. Muestra la respuesta exitosa JSON devuelta por la API de Meta que aparecerá abajo en color verde.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Interactive Console */}
        <div className="lg:col-span-2">
          {activeTab === 'messaging' ? (
            /* TAB 1: MESSAGING */
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                <MessageSquare className="text-blue-600" />
                <span>Enviar Mensaje de Prueba (Outbound)</span>
              </h2>
              
              <form onSubmit={handleSendMessage} className="space-y-6">
                
                {/* Phone Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Número de Teléfono Destino
                  </label>
                  <input 
                    type="text" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ej: +5215512345678"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Debe incluir el código de país (ej. +521 o +52) y no contener espacios ni guiones.
                  </p>
                </div>

                {/* Message Type Toggle */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Tipo de Mensaje
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setMessageType('template')}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        messageType === 'template'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Plantilla Oficial
                    </button>
                    <button
                      type="button"
                      disabled={status?.provider_type === 'meta_cloud_api'}
                      onClick={() => setMessageType('text')}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        status?.provider_type === 'meta_cloud_api' ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        messageType === 'text'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Texto Plano (Open Session)
                    </button>
                  </div>
                  {status?.provider_type === 'meta_cloud_api' && (
                    <p className="text-[9px] text-amber-600 font-semibold leading-relaxed">
                      * Para Meta Cloud API directa, se requiere enviar una plantilla pre-aprobada si no hay una ventana de 24 horas abierta.
                    </p>
                  )}
                </div>

                {messageType === 'template' ? (
                  /* Template Details */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-blue-50/20 border border-blue-100/50 rounded-2xl relative">
                    <button
                      type="button"
                      onClick={() => refetchTemplates()}
                      className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                      title="Actualizar plantillas"
                    >
                      <RefreshCw size={14} className={isLoadingTemplates ? 'animate-spin text-blue-600' : ''} />
                    </button>
                    
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <span className="block text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        Selecciona la Plantilla en Meta
                      </span>
                      {isLoadingTemplates ? (
                        <div className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>Cargando plantillas...</span>
                        </div>
                      ) : templates.length > 0 ? (
                        <select
                          value={templateName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTemplateName(val);
                            const matched = templates.find(t => t.name === val);
                            if (matched) {
                              setLanguage(matched.language);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                        >
                          <option value="">-- Selecciona una plantilla --</option>
                          {templates.map((t) => (
                            <option key={`${t.name}_${t.language}`} value={t.name}>
                              {t.name} ({t.status}) - {t.language}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="hello_world"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                        />
                      )}
                    </div>
                    
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <span className="block text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        Idioma (Code)
                      </span>
                      <input 
                        type="text" 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        placeholder="en_US"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* Text Input */
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Contenido del Mensaje
                    </label>
                    <textarea 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none"
                      placeholder="Escribe el mensaje..."
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={sendTestMutation.isPending || !isConnected}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:shadow-none active:scale-[0.98]"
                >
                  {sendTestMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  <span>Enviar Mensaje de Prueba</span>
                </button>

              </form>
            </div>
          ) : (
            /* TAB 2: TEMPLATE CREATION */
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <PlusCircle className="text-blue-600" />
                <span>Crear Plantilla en WhatsApp Business Account</span>
              </h2>
              
              <form onSubmit={handleCreateTemplate} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Template Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Nombre de la Plantilla
                    </label>
                    <input 
                      type="text" 
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="ej: xerpa_bienvenida"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                      required
                    />
                    <p className="text-[9px] text-slate-400 font-medium">Solo letras minúsculas y guiones bajos.</p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Categoría
                    </label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                    >
                      <option value="MARKETING">Marketing / MARKETING (Recomendado)</option>
                      <option value="UTILITY">Utilidad / UTILITY</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Idioma
                    </label>
                    <select
                      value={newTemplateLang}
                      onChange={(e) => setNewTemplateLang(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                    >
                      <option value="es_MX">Español México (es_MX)</option>
                      <option value="es_ES">Español España (es_ES)</option>
                      <option value="en_US">Inglés USA (en_US)</option>
                    </select>
                  </div>
                </div>

                {/* Body Text */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Cuerpo del Mensaje (Body)
                  </label>
                  <textarea 
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none"
                    placeholder="Escribe el cuerpo de la plantilla."
                    required
                  />
                </div>

                {/* Submit Template */}
                <button
                  type="submit"
                  disabled={createTemplateMutation.isPending || !isConnected}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:shadow-none active:scale-[0.98]"
                >
                  {createTemplateMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <PlusCircle size={18} />
                  )}
                  <span>Crear Plantilla Oficial</span>
                </button>
              </form>

              {/* JSON Success Output for Meta Video Evidence */}
              {createdTemplate && (
                <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-800 font-bold">
                    <CheckCircle2 size={16} />
                    <span>Respuesta de la API de Meta (Evidencia de creación)</span>
                  </div>
                  <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto shadow-inner leading-relaxed">
                    {JSON.stringify(createdTemplate, null, 2)}
                  </pre>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Esta estructura JSON demuestra que Xerpā está conectado al endpoint oficial de Meta y ha registrado una nueva plantilla en tu cuenta Business exitosamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
