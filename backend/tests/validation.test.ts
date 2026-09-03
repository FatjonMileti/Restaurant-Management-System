import {
  registerSchema,
  loginSchema,
  menuItemSchema,
  orderItemSchema,
  createOrderSchema,
  updateOrderSchema,
  reservationSchema,
  categorySchema,
  restaurantSettingsSchema,
  createUserSchema,
  updateUserRoleSchema,
  validate,
} from '../graphql/validation';

describe('validation schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid data', () => {
      const result = validate(registerSchema, {
        name: 'John',
        email: 'john@example.com',
        password: 'secret123',
      });
      expect(result.success).toBe(true);
    });
    it('rejects invalid email', () => {
      const result = validate(registerSchema, {
        name: 'John',
        email: 'invalid',
        password: 'secret123',
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors.join(' ')).toMatch(/Invalid email/);
    });
    it('rejects short password', () => {
      const result = validate(registerSchema, {
        name: 'John',
        email: 'john@example.com',
        password: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('validates correct login', () => {
      expect(validate(loginSchema, { email: 'a@b.com', password: 'pwd' }).success).toBe(true);
    });
    it('rejects missing password', () => {
      expect(validate(loginSchema, { email: 'a@b.com', password: '' }).success).toBe(false);
    });
  });

  describe('menuItemSchema', () => {
    it('requires positive price', () => {
      const r = validate(menuItemSchema, { name: 'Pizza', price: -5, category: 'Food' });
      expect(r.success).toBe(false);
    });
    it('allows empty image', () => {
      const r = validate(menuItemSchema, { name: 'Pizza', price: 10, category: 'Food', image: '' });
      expect(r.success).toBe(true);
    });
    it('rejects invalid image url', () => {
      const r = validate(menuItemSchema, {
        name: 'Pizza',
        price: 10,
        category: 'Food',
        image: 'not-url',
      });
      expect(r.success).toBe(false);
    });
    it('partial validation for update', () => {
      const r = validate(menuItemSchema.partial(), { price: 12.5 });
      expect(r.success).toBe(true);
    });
  });

  describe('order schemas', () => {
    it('validates orderItem', () => {
      expect(
        validate(orderItemSchema, { menuItem: '123', name: 'Pizza', quantity: 2, price: 10 })
          .success,
      ).toBe(true);
    });
    it('rejects zero quantity', () => {
      expect(
        validate(orderItemSchema, { menuItem: '123', name: 'Pizza', quantity: 0, price: 10 })
          .success,
      ).toBe(false);
    });
    it('requires at least one item', () => {
      expect(validate(createOrderSchema, { items: [] }).success).toBe(false);
    });
    it('validates create order with table', () => {
      expect(
        validate(createOrderSchema, {
          items: [{ menuItem: 'abc', name: 'Pizza', quantity: 1, price: 10 }],
          tableNumber: 5,
        }).success,
      ).toBe(true);
    });
    it('rejects invalid paymentMethod', () => {
      expect(
        validate(updateOrderSchema, {
          paymentMethod: 'bitcoin' as any,
        }).success,
      ).toBe(false);
    });
  });

  describe('reservationSchema', () => {
    it('validates correct reservation', () => {
      expect(
        validate(reservationSchema, { date: '2025-01-01', time: '18:00', guests: 2 }).success,
      ).toBe(true);
    });
    it('rejects zero guests', () => {
      expect(
        validate(reservationSchema, { date: '2025-01-01', time: '18:00', guests: 0 }).success,
      ).toBe(false);
    });
  });

  describe('categorySchema', () => {
    it('requires name', () => {
      expect(validate(categorySchema, { name: '' }).success).toBe(false);
    });
  });

  describe('restaurantSettingsSchema', () => {
    it('allows empty optional fields', () => {
      expect(validate(restaurantSettingsSchema, {}).success).toBe(true);
    });
    it('rejects tableCount 0', () => {
      expect(validate(restaurantSettingsSchema, { tableCount: 0 }).success).toBe(false);
    });
  });

  describe('user schemas', () => {
    it('validates create user', () => {
      expect(
        validate(createUserSchema, {
          name: 'Bob',
          email: 'bob@example.com',
          password: 'secret123',
          role: 'staff',
        }).success,
      ).toBe(true);
    });
    it('rejects invalid role', () => {
      expect(validate(updateUserRoleSchema, { role: 'superadmin' as any }).success).toBe(false);
    });
  });
});
