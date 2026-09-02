jest.mock('../models/RestaurantSettings', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), create: jest.fn() },
}));
jest.mock('../graphql/helpers/auth', () => ({ requireAdmin: jest.fn() }));
jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import RestaurantSettings from '../models/RestaurantSettings';
import { settingsResolvers } from '../graphql/resolvers/settings';
import { requireAdmin } from '../graphql/helpers/auth';

describe('settings resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('restaurantSettings returns formatted settings', async () => {
    const fake = { _id: 'id', name: 'Rest', logo: '', tableCount: 10, toObject: () => ({ _id: 'id', name: 'Rest', tableCount: 10 }) };
    (RestaurantSettings.findOne as unknown as jest.Mock).mockResolvedValue(fake as any);
    const res: any = await settingsResolvers.restaurantSettings();
    expect(res.name).toBe('Rest');
  });

  it('updateRestaurantSettings requires admin', async () => {
    (requireAdmin as unknown as jest.Mock).mockRejectedValue(new Error('Not authorized, admin only'));
    await expect(settingsResolvers.updateRestaurantSettings({ name: 'New' }, {})).rejects.toThrow('Not authorized');
  });

  it('validates tableCount', async () => {
    (requireAdmin as unknown as jest.Mock).mockResolvedValue({ role: 'admin' });
    (RestaurantSettings.findOne as unknown as jest.Mock).mockResolvedValue({
      name: 'Old',
      save: jest.fn().mockResolvedValue(true),
      tableCount: 10,
      toObject: () => ({ _id: 'id', name: 'Old', tableCount: 10 }),
    } as any);
    await expect(settingsResolvers.updateRestaurantSettings({ tableCount: 0 }, { userId: '1' })).rejects.toThrow();
  });
});
