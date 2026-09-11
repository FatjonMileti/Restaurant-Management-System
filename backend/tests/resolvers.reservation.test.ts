import { getDB } from '../config/rxdb.js';
import { reservationResolvers } from '../graphql/resolvers/reservation';
import { emitEvent } from '../sse.js';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../sse', () => ({ emitEvent: jest.fn() }));

const mockUsersById = (usersById: Record<string, any>) => ({
  findOne: jest.fn().mockImplementation((id: string) => ({
    exec: jest.fn().mockResolvedValue(usersById[id] ? { toJSON: () => usersById[id] } : null),
  })),
});

const staffUsers = () => mockUsersById({ staff1: { _id: 'staff1', role: 'staff' } });

const mockDoc = (json: any) => ({ toJSON: () => json });

describe('reservation resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reservations resolves user id to formatted user', async () => {
    const resDoc = mockDoc({
      _id: 'r1',
      user: 'u1',
      date: '2025-06-15',
      time: '19:00',
      guests: 2,
      status: 'confirmed',
    });
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: mockUsersById({
        staff1: { _id: 'staff1', role: 'staff' },
        u1: { _id: 'u1', name: 'Jane', email: 'jane@example.com', role: 'customer' },
      }),
      reservations: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([resDoc]),
          }),
        }),
      },
    });
    const res: any = await reservationResolvers.reservations({}, { userId: 'staff1' });
    expect(res[0].user.id).toBe('u1');
    expect(res[0].user.name).toBe('Jane');
    expect(res[0].date).toBe('2025-06-15');
  });

  it('createReservation returns formatted reservation with user', async () => {
    const insertedJson = {
      _id: 'r2',
      user: 'u1',
      date: '2025-06-16',
      time: '20:00',
      guests: 4,
      status: 'confirmed',
    };
    const resDoc = mockDoc(insertedJson);
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: mockUsersById({
        staff1: { _id: 'staff1', role: 'staff' },
        u1: { _id: 'u1', name: 'John', email: 'john@example.com', role: 'customer' },
      }),
      reservations: { insert: jest.fn().mockResolvedValue(resDoc) },
    });
    const res: any = await reservationResolvers.createReservation(
      { date: '2025-06-16', time: '20:00', guests: 4 },
      { userId: 'staff1' },
    );
    expect(res.id).toBe('r2');
    // mock insert returns user 'u1', resolved via lookup
    expect(res.user.id).toBe('u1');
    expect(res.user.name).toBe('John');
    expect(emitEvent).toHaveBeenCalledWith('reservations:changed');
  });

  it('createReservation rejects invalid data', async () => {
    await expect(
      reservationResolvers.createReservation(
        { date: '', time: '20:00', guests: 0 },
        { userId: 'staff1' },
      ),
    ).rejects.toThrow();
    expect(emitEvent).not.toHaveBeenCalled();
  });
});
