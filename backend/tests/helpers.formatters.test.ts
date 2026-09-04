jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

import { getDB } from '../config/rxdb';
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
  it('formats doc with toJSON', () => {
    const doc = {
      toJSON: () => ({
        _id: 'user1',
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
    expect(res.id).toBe('user1');
    expect(res.createdAt).toContain('2024-01-01');
  });
  it('handles plain object without toJSON', () => {
    const plain = {
      _id: 'user2',
      name: 'Jane',
      email: 'jane@example.com',
      role: 'admin',
    };
    const res: any = formatUser(plain as any);
    expect(res.name).toBe('Jane');
    expect(res.id).toBe('user2');
  });
  it('defaults phone to null', () => {
    const plain = {
      _id: 'user3',
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
    const doc = { _id: 'menu1', name: 'Pizza', price: 10, category: 'Food', available: true };
    const res: any = formatMenuItem(doc as any);
    expect(res.id).toBe('menu1');
    expect(res.name).toBe('Pizza');
  });
  it('returns null for null', () => {
    expect(formatMenuItem(null as any)).toBeNull();
  });
  it('handles toJSON doc', () => {
    const doc = { toJSON: () => ({ _id: 'menu2', name: 'Burger', price: 5, category: 'Food' }) };
    const res: any = formatMenuItem(doc as any);
    expect(res.id).toBe('menu2');
  });
});

describe('formatCategory', () => {
  it('maps _id to id', () => {
    const res: any = formatCategory({ _id: 'cat1', name: 'Drinks' } as any);
    expect(res.id).toBe('cat1');
    expect(res.name).toBe('Drinks');
  });
});

describe('formatOrder', () => {
  it('formats order with populated menuItem', () => {
    const order: any = {
      _id: 'order1',
      user: { _id: 'user1', name: 'John', email: 'john@example.com', role: 'customer' },
      items: [
        {
          name: 'Pizza',
          quantity: 2,
          price: 10,
          menuItem: { _id: 'menu1', name: 'Pizza', price: 10, category: 'Food' },
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
    expect(res.id).toBe('order1');
    expect(res.items[0].menuItem.id).toBe('menu1');
    expect(res.user.id).toBe('user1');
    expect(res.totalAmount).toBe(20);
  });
  it('handles lean order without populated user', () => {
    const order: any = { _id: 'order2', items: [], totalAmount: 0, status: 'pending' };
    const res: any = formatOrder(order);
    expect(res.id).toBe('order2');
    expect(res.user).toBeNull();
  });
});

describe('formatReservation', () => {
  it('formats date with moment', () => {
    const doc: any = {
      _id: 'res1',
      user: { _id: 'user1', name: 'Jane', email: 'jane@example.com', role: 'customer' },
      date: new Date('2025-06-15'),
      time: '19:00',
      guests: 2,
      status: 'confirmed',
    };
    const res: any = formatReservation(doc);
    expect(res.id).toBe('res1');
    expect(res.date).toBe('2025-06-15');
    expect(res.user.id).toBe('user1');
  });
});

describe('formatRestaurantSettings', () => {
  it('returns null for null', () => {
    expect(formatRestaurantSettings(null as any)).toBeNull();
  });
  it('formats settings', () => {
    const res: any = formatRestaurantSettings({ _id: 'set1', name: 'My Rest', tableCount: 12 } as any);
    expect(res.id).toBe('set1');
    expect(res.name).toBe('My Rest');
    expect(res.tableCount).toBe(12);
  });
});
