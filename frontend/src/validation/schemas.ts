import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  image: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const orderFormSchema = z.object({
  tableNumber: z.string().optional(),
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
  name: z.string().min(1, 'Name is required'),
  logo: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  tableCount: z.number().int().min(1, 'Table count must be at least 1'),
});

export const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['customer', 'staff', 'admin']),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MenuItemFormData = z.infer<typeof menuItemSchema>;
export type OrderFormData = z.infer<typeof orderFormSchema>;
export type ReservationFormData = z.infer<typeof reservationSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type RestaurantSettingsFormData = z.infer<typeof restaurantSettingsSchema>;
export type UserFormData = z.infer<typeof userFormSchema>;
