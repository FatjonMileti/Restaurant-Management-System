import { getDB } from '../config/rxdb.js';
import { activityResolvers } from '../graphql/resolvers/activity';
import { formatActivityLog, recordActivity } from '../graphql/helpers/activityLog';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../sse', () => ({ emitEvent: jest.fn() }));

const adminCtx = { userId: 'admin1' };

const adminUserDoc = {
  toJSON: () => ({ _id: 'admin1', name: 'Admin', email: 'admin@restaurant.com', role: 'admin' }),
};

describe('activity resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('activityLogs requires admin', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: { findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) },
    });
    await expect(activityResolvers.activityLogs({}, {})).rejects.toThrow();
  });

  it('activityLogs filters, searches and paginates newest-first', async () => {
    const rows = [
      {
        _id: '3',
        action: 'delete',
        entity: 'order',
        summary: 'Order 3 deleted',
        actorName: 'Admin',
        createdAt: '2024-03-01T00:00:00.000Z',
      },
      {
        _id: '2',
        action: 'create',
        entity: 'reservation',
        summary: 'Reservation created',
        actorName: 'Staff',
        createdAt: '2024-02-01T00:00:00.000Z',
      },
      {
        _id: '1',
        action: 'create',
        entity: 'order',
        summary: 'Order created',
        actorName: 'Admin',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: {
        findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(adminUserDoc) }),
      },
      activityLogs: {
        find: jest.fn().mockReturnValue({
          sort: jest
            .fn()
            .mockReturnValue({
              exec: jest.fn().mockResolvedValue(rows.map((r) => ({ toJSON: () => r }))),
            }),
          exec: jest.fn().mockResolvedValue(rows.map((r) => ({ toJSON: () => r }))),
        }),
      },
    });
    const filtered: any = await activityResolvers.activityLogs({ entity: 'order' }, adminCtx);
    expect(filtered).toHaveLength(2);
    const searched: any = await activityResolvers.activityLogs({ search: 'reservation' }, adminCtx);
    expect(searched).toHaveLength(1);
    const paged: any = await activityResolvers.activityLogs({ limit: 1, offset: 1 }, adminCtx);
    expect(paged).toHaveLength(1);
    expect(paged[0].id).toBe('2');
    const count: any = await activityResolvers.activityLogCount({ entity: 'order' }, adminCtx);
    expect(count).toBe(2);
  });

  it('clearActivityLogs removes all entries', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: {
        findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(adminUserDoc) }),
      },
      activityLogs: {
        find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([{ remove }]) }),
        cleanup: jest.fn().mockResolvedValue(undefined),
      },
    });
    const res = await activityResolvers.clearActivityLogs({}, adminCtx);
    expect(res).toBe('Activity logs cleared');
    expect(remove).toHaveBeenCalled();
  });

  it('formatActivityLog maps _id to id', () => {
    expect(formatActivityLog({ _id: 'a1', action: 'create', entity: 'order' })).toMatchObject({
      id: 'a1',
      action: 'create',
    });
    expect(formatActivityLog(null)).toBeNull();
  });

  it('recordActivity never throws when db is unavailable', async () => {
    (getDB as unknown as jest.Mock).mockRejectedValue(new Error('no db'));
    await expect(
      recordActivity(adminCtx, { action: 'create', entity: 'order', summary: 'x' }),
    ).resolves.toBeUndefined();
  });
});
