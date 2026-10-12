export type Language = 'en' | 'es';

export const dictionary: Record<string, Record<Language, string>> = {
  SHARE_OF_SHELF: {
    en: 'Shelf Presence Check',
    es: 'Revisión de Anaquel'
  },
  THREAT_RESPONSE: {
    en: 'Competitive Response',
    es: 'Respuesta Competitiva'
  },
  NEW_PRODUCT_INTRODUCTION: {
    en: 'Launch New Product',
    es: 'Lanzamiento de Producto'
  },
  INVENTORY_VELOCITY_OOS_PREVENTION: {
    en: 'Prevent Stockouts',
    es: 'Prevención de Agotados'
  },
  PERFECT_STORE_ASSORTMENT_COMPLIANCE: {
    en: 'Store Standards Check',
    es: 'Estándares de Tienda'
  },
  SEASONAL_EVENT_ACTIVATION: {
    en: 'Seasonal Promotion',
    es: 'Promoción de Temporada'
  },
  TRADE_LOYALTY_VOLUME_PUSHING: {
    en: 'Drive Larger Orders',
    es: 'Impulso de Volumen'
  },
  POSM_MAINTENANCE_ASSET_PURITY: {
    en: 'Maintain Promo Materials',
    es: 'Mantenimiento de Materiales'
  },
  // Add fallback/generic terms to avoid hardcoding jargon
  GENERAL: {
    en: 'General',
    es: 'General'
  },
  UNITS: {
    en: 'units',
    es: 'unidades'
  },
  STORES: {
    en: 'Accounts',
    es: 'Cuentas'
  },
  STORE: {
    en: 'Account',
    es: 'Cuenta'
  },
  RETAILERS: {
    en: 'Clients',
    es: 'Clientes'
  },
  RETAILER: {
    en: 'Client',
    es: 'Cliente'
  },
  PRODUCTS: {
    en: 'Products',
    es: 'Productos'
  },
  PRODUCT: {
    en: 'Product',
    es: 'Producto'
  },
  ORDERS: {
    en: 'Orders',
    es: 'Pedidos'
  },
  ORDER: {
    en: 'Order',
    es: 'Pedido'
  }
};
