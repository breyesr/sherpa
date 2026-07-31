import { z } from 'zod';

export const clientFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  phone: z.string().optional().nullable().transform(val => val === '' ? null : val),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  role: z.string().optional().nullable().transform(val => val === '' ? null : val),
  birthday: z.string().optional().nullable().transform(val => val === '' ? null : val),
  gender: z.string().optional().nullable().transform(val => val === '' ? null : val),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
});

export type ClientFormValues = z.input<typeof clientFormSchema>;
