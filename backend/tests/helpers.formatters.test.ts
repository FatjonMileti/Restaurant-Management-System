import mongoose from 'mongoose';
import {
  formatUser,
  formatMenuItem,
  formatCategory,
  formatOrder,
  formatReservation,
  formatRestaurantSettings,
} from '../graphql/helpers/formatters';

describe('formatUser', () => {
  it('returns null for null', () => {
    expect(formatUser(null)).toBeNull();
  });
  it('formats mongoose doc with toObject', () => {
    const doc = {
      toObject: () => ({
        _id: new mongoose.Types.ObjectId(),
        name: 'John',
        email: 'john@example.com',
        role: 'customer',
        phone: '123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T10:00:00Z'),
      }),
    };
    const res: any = formatUser(doc as any);
    expect(res.name).toBe('John');
    expect(res.email).toBe('john@example.com');
    expect(res.phone).toBe('123');
    expect(res.id).toBeDefined();
    expect(res.createdAt).toContain('2024-01-01');
  });
  it('handles plain object without toObject', () => {
    const plain = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Jane',
      email: 'jane@example.com',
      role: 'admin',
    };
    const res: any = formatUser(plain as any);
    expect(res.name).toBe('Jane');
    expect(res.id).toBeDefined();
  });
  it('defaults phone to null', () => {
    const plain = {
      _id: new mongoose.Types.ObjectId(),
      name: 'A',
      email: 'a@b.com',
      role: 'customer',
    };
    const res: any = formatUser(plain as any);
    expect(res.phone).toBeNull();
  });
});

describe('formatMenuItem', () => {
  it('maps _id to id', () => {
    const id = new mongoose.Types.ObjectId();
    const doc = { _id: id, name: 'Pizza', price: 10, category: 'Food', available: true };
    const res: any = formatMenuItem(doc as any);
    expect(res.id).toBe(id.toString());
    expect(res.name).toBe('Pizza');
  });
  it('returns null for null', () => {
    expect(formatMenuItem(null as any)).toBeNull();
  });
  it('handles toObject doc', () => {
    const id = new mongoose.Types.ObjectId();
    const doc = { toObject: () => ({ _id: id, name: 'Burger', price: 5, category: 'Food' }) };
    const res: any = formatMenuItem(doc as any);
    expect(res.id).toBe(id.toString());
  });
});

describe('formatCategory', () => {
  it('maps _id to id', () => {
    const id = new mongoose.Types.ObjectId();
    const res: any = formatCategory({ _id: id, name: 'Drinks' } as any);
    expect(res.id).toBe(id.toString());
    expect(res.name).toBe('Drinks');
  });
});

describe('formatOrder', () => {
  it('formats order with populated menuItem', () => {
    const orderId = new mongoose.Types.ObjectId();
    const menuId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const order: any = {
      _id: orderId,
      user: { _id: userId, name: 'John', email: 'john@example.com', role: 'customer' },
      items: [
        {
          name: 'Pizza',
          quantity: 2,
          price: 10,
          menuItem: { _id: menuId, name: 'Pizza', price: 10, category: 'Food' },
        },
      ],
      totalAmount: 20,
      status: 'pending',
      tableNumber: 5,
      paymentMethod: 'cash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res: any = formatOrder(order);
    expect(res.id).toBe(orderId.toString());
    expect(res.items[0].menuItem.id).toBe(menuId.toString());
    expect(res.user.id).toBe(userId.toString());
    expect(res.totalAmount).toBe(20);
  });
  it('handles lean order without populated user', () => {
    const orderId = new mongoose.Types.ObjectId();
    const order: any = { _id: orderId, items: [], totalAmount: 0, status: 'pending' };
    const res: any = formatOrder(order);
    expect(res.id).toBe(orderId.toString());
    expect(res.user).toBeNull();
  });
});

describe('formatReservation', () => {
  it('formats date with moment', () => {
    const id = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const doc: any = {
      _id: id,
      user: { _id: userId, name: 'Jane', email: 'jane@example.com', role: 'customer' },
      date: new Date('2025-06-15'),
      time: '19:00',
      guests: 2,
      status: 'confirmed',
    };
    const res: any = formatReservation(doc);
    expect(res.id).toBe(id.toString());
    expect(res.date).toBe('2025-06-15');
    expect(res.user.id).toBe(userId.toString());
  });
});

describe('formatRestaurantSettings', () => {
  it('returns null for null', () => {
    expect(formatRestaurantSettings(null as any)).toBeNull();
  });
  it('formats settings', () => {
    const id = new mongoose.Types.ObjectId();
    const res: any = formatRestaurantSettings({ _id: id, name: 'My Rest', tableCount: 12 } as any);
    expect(res.id).toBe(id.toString());
    expect(res.name).toBe('My Rest');
    expect(res.tableCount).toBe(12);
  });
});
