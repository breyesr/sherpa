import { z } from 'zod';

export const orderLineItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Price must be non-negative'),
});

export const orderFormSchema = z.object({
  store_id: z.string().min(1, 'Store/Point of sale is required'),
  client_id: z.string().optional().nullable().transform(val => val === '' ? null : val),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  payment_method: z.string().default('Cash'),
  items: z.array(orderLineItemSchema).min(1, 'At least one product must be added to the order'),
});

export type OrderLineItemValues = z.infer<typeof orderLineItemSchema>;
export type OrderFormValues = z.infer<typeof orderFormSchema>;
