import { loginSchema, registerSchema, menuItemSchema, reservationSchema, restaurantSettingsSchema, userFormSchema, orderFormSchema } from '../schemas';

describe('frontend validation schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid login', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(true);
    });
    it('rejects invalid email', () => {
      expect(loginSchema.safeParse({ email: 'invalid', password: '123' }).success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('rejects short password', () => {
      expect(registerSchema.safeParse({ name: 'John', email: 'john@example.com', password: '123' }).success).toBe(false);
    });
  });

  describe('menuItemSchema', () => {
    it('validates correct item', () => {
      expect(menuItemSchema.safeParse({ name: 'Pizza', price: 10, category: 'Food', image: '' }).success).toBe(true);
    });
    it('rejects negative price', () => {
      expect(menuItemSchema.safeParse({ name: 'Pizza', price: -5, category: 'Food' }).success).toBe(false);
    });
  });

  describe('reservationSchema', () => {
    it('validates reservation', () => {
      expect(reservationSchema.safeParse({ date: '2025-01-01', time: '18:00', guests: 2 }).success).toBe(true);
    });
  });

  describe('restaurantSettingsSchema', () => {
    it('requires name', () => {
      expect(restaurantSettingsSchema.safeParse({ name: '', tableCount: 5 }).success).toBe(false);
    });
    it('requires tableCount >=1', () => {
      expect(restaurantSettingsSchema.safeParse({ name: 'Rest', tableCount: 0 }).success).toBe(false);
    });
  });

  describe('userFormSchema', () => {
    it('validates user', () => {
      expect(userFormSchema.safeParse({ name: 'Bob', email: 'bob@example.com', password: 'secret123', role: 'staff' }).success).toBe(true);
    });
  });

  describe('orderFormSchema', () => {
    it('allows empty tableNumber', () => {
      expect(orderFormSchema.safeParse({ tableNumber: '' }).success).toBe(true);
    });
  });
});
