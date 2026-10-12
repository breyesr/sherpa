export interface StoreActionObjective {
  name: string;
  label: string;
  category: string;
}

export interface ActionFormData {
  store_id: string;
  template_id: string;
  category: 'COMMERCIAL' | 'MARKETING';
  objective: string;
  assigned_to_id: string;
  due_date: string;
  impact_level: string;
  title: string;
  description: string;
  result_unit: string;
  target_value: string;
  details: Record<string, unknown>;
}

export interface ResolutionFormData {
  status: string;
  resolution_notes: string;
  result_value: string;
  revenue_impact: string;
}

export interface TemplateFormData {
  name: string;
  category: string;
  objective: string;
  default_unit: string;
  description: string;
  target_value: string;
  impact_level: string;
}

export const DEFAULT_OBJECTIVE_MAP: Record<string, string> = {
  THREAT_RESPONSE: 'Competitive Response',
  SHARE_OF_SHELF: 'Shelf Presence Check',
  NEW_PRODUCT_INTRODUCTION: 'Launch New Product',
  INVENTORY_VELOCITY_OOS_PREVENTION: 'Prevent Stockouts',
  PERFECT_STORE_ASSORTMENT_COMPLIANCE: 'Store Standards Check',
  SEASONAL_EVENT_ACTIVATION: 'Seasonal Promotion',
  TRADE_LOYALTY_VOLUME_PUSHING: 'Drive Larger Orders',
  POSM_MAINTENANCE_ASSET_PURITY: 'Maintain Promo Materials',
};

export const DEFAULT_OBJECTIVES: StoreActionObjective[] = [
  { name: 'THREAT_RESPONSE', label: 'Competitive Response', category: 'COMMERCIAL' },
  { name: 'THREAT_RESPONSE', label: 'Competitive Response', category: 'MARKETING' },
  { name: 'SHARE_OF_SHELF', label: 'Shelf Presence Check', category: 'MARKETING' },
  { name: 'NEW_PRODUCT_INTRODUCTION', label: 'Launch New Product', category: 'COMMERCIAL' },
  { name: 'NEW_PRODUCT_INTRODUCTION', label: 'Launch New Product', category: 'MARKETING' },
  { name: 'INVENTORY_VELOCITY_OOS_PREVENTION', label: 'Prevent Stockouts', category: 'COMMERCIAL' },
  { name: 'PERFECT_STORE_ASSORTMENT_COMPLIANCE', label: 'Store Standards Check', category: 'COMMERCIAL' },
  { name: 'PERFECT_STORE_ASSORTMENT_COMPLIANCE', label: 'Store Standards Check', category: 'MARKETING' },
  { name: 'SEASONAL_EVENT_ACTIVATION', label: 'Seasonal Promotion', category: 'MARKETING' },
  { name: 'TRADE_LOYALTY_VOLUME_PUSHING', label: 'Drive Larger Orders', category: 'COMMERCIAL' },
  { name: 'POSM_MAINTENANCE_ASSET_PURITY', label: 'Maintain Promo Materials', category: 'MARKETING' },
];
