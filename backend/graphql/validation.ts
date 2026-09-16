import { z } from 'zod';

// Menu photos and the restaurant logo are stored as bare filenames
// (`restaurant.jpeg`, resolved against REACT_APP_API_URL + /images on the
// client), backend-relative paths (`/images/x.jpg`), or absolute URLs.
export const imageRefSchema = z
  .string()
  .max(500, 'Image reference is too long')
  .optional()
  .or(z.literal(''));

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
  image: imageRefSchema,
  available: z.boolean().optional(),
});

export const orderItemSchema = z.object({
  menuItem: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  price: z.number().positive('Price must be positive'),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  tableNumber: z
    .number({ error: 'Table number is required' })
    .int()
    .positive('Table number is required'),
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
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.enum(['confirmed', 'completed', 'cancelled']).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

export const restaurantSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  logo: imageRefSchema,
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
