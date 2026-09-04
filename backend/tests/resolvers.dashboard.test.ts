jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import { getDB } from '../config/rxdb';
import { dashboardResolvers } from '../graphql/resolvers/dashboard';

const mockFind = (data: any[]) => jest.fn().mockReturnValue({
  exec: jest.fn().mockResolvedValue(data.map((d) => ({ toJSON: () => d }))),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
});

const mockCollection = (data: any[]) => ({
  find: mockFind(data),
  findOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(data.length > 0 ? { toJSON: () => data[0] } : null),
  }),
});

beforeEach(() => jest.clearAllMocks());

describe('dashboard resolver', () => {
  it('throws if not authenticated', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: { find: mockFind([]) },
    });
    await expect(dashboardResolvers.dashboardStats({}, {})).rejects.toThrow('Not authenticated');
  });

  it('returns aggregated stats when authenticated', async () => {
    const mockDB = {
      orders: mockCollection([
        { _id: 'o1', status: 'pending', totalAmount: 20, tableNumber: 1, createdAt: new Date().toISOString() },
        { _id: 'o2', status: 'completed', totalAmount: 50, tableNumber: 2, createdAt: new Date().toISOString() },
      ]),
      reservations: mockCollection([
        { _id: 'r1', status: 'confirmed', tableNumber: 3, createdAt: new Date().toISOString() },
      ]),
      menuItems: mockCollection([
        { _id: 'm1', available: true },
        { _id: 'm2', available: false },
      ]),
      users: mockCollection([
        { _id: 'u1', role: 'admin' },
      ]),
      categories: mockCollection([
        { _id: 'c1', name: 'Food' },
      ]),
      settings: {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            toJSON: () => ({ _id: 's1', tableCount: 10 }),
          }),
        }),
      },
    };
    (getDB as unknown as jest.Mock).mockResolvedValue(mockDB);

    const res: any = await dashboardResolvers.dashboardStats({}, { userId: 'u1' });
    expect(res.totalTables).toBe(10);
    expect(typeof res.totalRevenue).toBe('number');
    expect(Array.isArray(res.recentOrders)).toBe(true);
    expect(Array.isArray(res.ordersByStatus)).toBe(true);
    expect(res.totalOrders).toBe(2);
    expect(res.pendingOrders).toBe(1);
    expect(res.completedOrders).toBe(1);
    expect(res.totalReservations).toBe(1);
    expect(res.confirmedReservations).toBe(1);
    expect(res.totalMenuItems).toBe(2);
    expect(res.availableMenuItems).toBe(1);
    expect(res.totalUsers).toBe(1);
    expect(res.totalCategories).toBe(1);
  });
});
