import { components } from './api';

export type VerticalType = components['schemas']['VerticalType'];
export type Business = components['schemas']['BusinessProfileResponse'];
export type Client = components['schemas']['ClientResponse'];
export type ClientDetail = components['schemas']['ClientDetailResponse'];
export type Store = components['schemas']['StoreResponse'];
export type Product = components['schemas']['ProductResponse'];
export type Order = components['schemas']['OrderResponse'];
export type StoreAction = components['schemas']['StoreActionResponse'];
export type CustomerNote = components['schemas']['CustomerNoteResponse'];
export type ActionTemplate = components['schemas']['ActionTemplateResponse'];
export type Prospect = components['schemas']['StoreResponse']; // In our DB, prospects are stores with is_prospect: true
export type User = components['schemas']['UserResponse'];
export type AppointmentResponse = components['schemas']['AppointmentResponse'];

export interface AttentionLead {
  id: string;
  name: string;
  prospect_segment: 'wholesale' | 'retail';
  created_at: string | null;
  total_revenue: number;
}

export interface DashboardStats {
  today_appointments: number;
  total_clients: number;
  flagged_clients: number;
  upcoming: AppointmentResponse[];
  campaign_flow_enabled?: boolean;
  campaign_orders_count?: number;
  wholesale_leads_count?: number;
  retail_leads_count?: number;
  wholesale_pipeline_value?: number;
  retail_pipeline_value?: number;
  attention_leads?: AttentionLead[];
  verified_leads_count?: number;
  unverified_leads_count?: number;
  leads_count_30d?: number;
  verified_orders_count_30d?: number;
  verified_wholesale_leads_count?: number;
  verified_retail_leads_count?: number;
}

export type ActionCategory = components['schemas']['ActionCategory'];
export type ActionStatus = components['schemas']['ActionStatus'];

export interface CRMField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'dropdown' | 'textarea' | 'multiselect';
  options?: string[];
}

export interface CatalogField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'dropdown' | 'textarea' | 'multiselect';
  options?: string[];
}

export type PostalCode = components['schemas']['PostalCodeResponse'];
