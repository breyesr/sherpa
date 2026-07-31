import { z } from 'zod';

export const accountFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  phone: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  street_address: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  colonia: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  municipality: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  city: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  state: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  zip_code: z.string()
    .regex(/^\d{5}$/, 'ZIP code must be exactly 5 digits')
    .optional()
    .nullable()
    .or(z.literal('')),
  country: z.string().default('México'),
  market: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  segment: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  region: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  external_id: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
  client_ids: z.array(z.string()).default([]),
  delivery_zip_codes: z.string().optional().nullable().transform(val => val === '' ? null : val).optional(),
});

export type AccountFormValues = z.input<typeof accountFormSchema>;
