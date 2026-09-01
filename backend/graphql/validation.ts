import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  image: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const orderItemSchema = z.object({
  menuItem: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  price: z.number().positive('Price must be positive'),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  tableNumber: z.number().int().positive().optional(),
  paymentMethod: z.enum(['cash', 'card']).optional(),
});

export const updateOrderSchema = z.object({
  items: z.array(orderItemSchema).optional(),
  tableNumber: z.number().int().positive().optional(),
  paymentMethod: z.enum(['cash', 'card']).optional(),
  status: z.enum(['pending', 'preparing', 'completed', 'cancelled']).optional(),
  totalAmount: z.number().positive().optional(),
});

export const reservationSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  guests: z.number().int().positive('Guests must be at least 1'),
  tableNumber: z.number().int().positive().optional(),
  specialRequests: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

export const restaurantSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  logo: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  tableCount: z.number().int().min(1, 'Table count must be at least 1').optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['customer', 'staff', 'admin']).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['customer', 'staff', 'admin']),
});

type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: result.error.issues.map((i) => i.message) };
}
