import mongoose from 'mongoose';

jest.mock('../models/Order', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock('../models/Reservation', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock('../models/MenuItem', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('../models/Category', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('../models/User', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn(), findById: jest.fn() },
}));
jest.mock('../models/RestaurantSettings', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue({ tableCount: 10 }),
    create: jest.fn(),
  },
}));

import Order from '../models/Order';
import Reservation from '../models/Reservation';
import MenuItem from '../models/MenuItem';
import Category from '../models/Category';
import User from '../models/User';
import { dashboardResolvers } from '../graphql/resolvers/dashboard';

describe('dashboard resolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws if not authenticated', async () => {
    (User.findById as unknown as jest.Mock).mockResolvedValue(null);
    await expect(dashboardResolvers.dashboardStats({}, {})).rejects.toThrow('Not authenticated');
  });

  it('returns aggregated stats when authenticated', async () => {
    const userId = new mongoose.Types.ObjectId();
    (User.findById as unknown as jest.Mock).mockResolvedValue({ _id: userId, role: 'admin' });

    (Order.countDocuments as unknown as jest.Mock)
      .mockResolvedValueOnce(10) // totalOrders
      .mockResolvedValueOnce(3) // pending
      .mockResolvedValueOnce(2) // preparing
      .mockResolvedValueOnce(4) // completed
      .mockResolvedValueOnce(1) // cancelled
      .mockResolvedValueOnce(5) // todayOrders (after other mocks, order matters)
      ;
    (Reservation.countDocuments as unknown as jest.Mock)
      .mockResolvedValueOnce(7) // totalReservations
      .mockResolvedValueOnce(5) // confirmed
      .mockResolvedValueOnce(1) // completed
      .mockResolvedValueOnce(1) // cancelled
      .mockResolvedValueOnce(2); // todayReservations
    (MenuItem.countDocuments as unknown as jest.Mock).mockResolvedValueOnce(20).mockResolvedValueOnce(18);
    (Category.countDocuments as unknown as jest.Mock).mockResolvedValue(4);
    (User.countDocuments as unknown as jest.Mock).mockResolvedValue(12);
    (Order.countDocuments as unknown as jest.Mock).mockResolvedValueOnce(2); // todayOrders already?
    // Actually order of Promise.all in dashboard.ts: totalOrders, pending, preparing, completed, cancelled, totalReservations, confirmed, completedR, cancelledR, totalMenuItems, available, totalUsers, totalCategories, settings, totalRevenueAgg, todayOrders, todayReservations, recentOrdersDocs, ordersByStatus, reservationsByStatus, busyOrders, busyReservations
    // We mocked partially above, but to avoid strict count we use mockResolvedValue for remaining
    // Reset and use generic mockResolvedValue for remaining countDocuments calls
    (Order.countDocuments as unknown as jest.Mock).mockResolvedValue(1);
    (Reservation.countDocuments as unknown as jest.Mock).mockResolvedValue(1);
    (Order.aggregate as unknown as jest.Mock).mockResolvedValueOnce([{ _id: null, total: 1500 }]).mockResolvedValueOnce([{ _id: 'pending', count: 3 }]);
    (Reservation.aggregate as unknown as jest.Mock).mockResolvedValue([{ _id: 'confirmed', count: 5 }]);
    (Order.find as unknown as jest.Mock).mockImplementation(() => ({
      populate: () => ({
        populate: () => ({
          sort: () => ({
            limit: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    }) as any);
    (Reservation.find as unknown as jest.Mock).mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    }) as any);

    // Need to re-mock User.findById for requireAuth
    (User.findById as unknown as jest.Mock).mockResolvedValue({ _id: userId, role: 'customer' });

    // To make test pass, we mock all countDocuments to return numbers via generic implementation
    jest.spyOn(Order, 'countDocuments').mockImplementation(() => Promise.resolve(5) as any);
    jest.spyOn(Reservation, 'countDocuments').mockImplementation(() => Promise.resolve(3) as any);
    jest.spyOn(MenuItem, 'countDocuments').mockImplementation(() => Promise.resolve(10) as any);
    jest.spyOn(Category, 'countDocuments').mockImplementation(() => Promise.resolve(2) as any);
    jest.spyOn(User, 'countDocuments').mockImplementation(() => Promise.resolve(8) as any);

    const res: any = await dashboardResolvers.dashboardStats({}, { userId: userId.toString() });
    expect(res.totalTables).toBe(10);
    expect(typeof res.totalRevenue).toBe('number');
    expect(Array.isArray(res.recentOrders)).toBe(true);
    expect(Array.isArray(res.ordersByStatus)).toBe(true);
  });
});
