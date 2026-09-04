import { getDB } from '../config/rxdb.js';
import { settingsResolvers } from '../graphql/resolvers/settings';
import { requireAdmin } from '../graphql/helpers/auth';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));
jest.mock('../graphql/helpers/auth', () => ({ requireAdmin: jest.fn() }));
jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

describe('settings resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('restaurantSettings returns formatted settings', async () => {
    const fake = {
      _id: 'id',
      name: 'Rest',
      logo: '',
      tableCount: 10,
      toJSON: () => ({ _id: 'id', name: 'Rest', tableCount: 10 }),
    };
    (getDB as unknown as jest.Mock).mockResolvedValue({ settings: { findOne: jest.fn().mockResolvedValue(fake) } });
    const res: any = await settingsResolvers.restaurantSettings();
    expect(res.name).toBe('Rest');
  });

  it('updateRestaurantSettings requires admin', async () => {
    (requireAdmin as unknown as jest.Mock).mockRejectedValue(
      new Error('Not authorized, admin only'),
    );
    await expect(settingsResolvers.updateRestaurantSettings({ name: 'New' }, {})).rejects.toThrow(
      'Not authorized',
    );
  });

  it('validates tableCount', async () => {
    (requireAdmin as unknown as jest.Mock).mockResolvedValue({ role: 'admin' });
    const fakeSettings = {
      _id: 'id',
      name: 'Old',
      save: jest.fn().mockResolvedValue(true),
      tableCount: 10,
      toJSON: () => ({ _id: 'id', name: 'Old', tableCount: 10 }),
    };
    (getDB as unknown as jest.Mock).mockResolvedValue({ settings: { findOne: jest.fn().mockResolvedValue(fakeSettings) } });
    await expect(
      settingsResolvers.updateRestaurantSettings({ tableCount: 0 }, { userId: '1' })
    ).rejects.toThrow();

  });
});
