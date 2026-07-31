import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Product name must be under 100 characters'),
  category_id: z.string().min(1, 'Category is required'),
  description: z.string().optional().nullable().transform(val => val === '' ? null : val),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  sku: z.string().optional().nullable().transform(val => val === '' ? null : val),
  brand: z.string().optional().nullable().transform(val => val === '' ? null : val),
  product_type: z.string().optional().nullable().transform(val => val === '' ? null : val),
  unit_of_measure: z.string().default('unit'),
  wholesale_threshold: z.coerce.number().optional().nullable().or(z.literal('')),
});

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name must be under 100 characters'),
  description: z.string().optional().nullable().transform(val => val === '' ? null : val),
  category_type: z.string().optional().nullable().transform(val => val === '' ? null : val),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
