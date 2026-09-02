jest.mock('../models/Order', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('../models/Reservation', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('../models/RestaurantSettings', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue({ tableCount: 5 }),
    create: jest.fn(),
  },
}));

import Order from '../models/Order';
import Reservation from '../models/Reservation';
import { tablesResolvers } from '../graphql/resolvers/tables';

describe('tables resolver', () => {
  it('returns table statuses with busy mapping', async () => {
    (Order.find as unknown as jest.Mock).mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ tableNumber: 1, _id: 'o1' }]) }) } as any);
    (Reservation.find as unknown as jest.Mock).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ tableNumber: 2, _id: 'r1' }]) }),
    } as any);
    const res = await tablesResolvers.tables();
    expect(res).toHaveLength(5);
    expect(res[0].isBusy).toBe(true);
    expect(res[0].busyType).toBe('order');
    expect(res[1].busyType).toBe('reservation');
    expect(res[2].isBusy).toBe(false);
  });

  it('returns all free when no busy', async () => {
    (Order.find as unknown as jest.Mock).mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) } as any);
    (Reservation.find as unknown as jest.Mock).mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) } as any);
    const res = await tablesResolvers.tables();
    expect(res.every((t: any) => !t.isBusy)).toBe(true);
  });
});
