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
    expect(emitEvent).toHaveBeenCalledWith(
      'reservations:changed',
      expect.objectContaining({ reservation: expect.objectContaining({ id: 'r2' }) }),
    );
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

  it('deleteCompletedReservations removes only completed/cancelled and returns count', async () => {
    const removed: string[] = [];
    const mkDoc = (id: string, status: string) => ({
      toJSON: () => ({ _id: id, status }),
      remove: jest.fn().mockImplementation(async () => {
        removed.push(id);
      }),
    });
    const docs = [mkDoc('r1', 'completed'), mkDoc('r2', 'cancelled'), mkDoc('r3', 'confirmed')];
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: mockUsersById({ admin1: { _id: 'admin1', role: 'admin' } }),
      reservations: {
        find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
        cleanup: jest.fn().mockResolvedValue(undefined),
      },
    });
    const res: any = await reservationResolvers.deleteCompletedReservations({}, { userId: 'admin1' });
    expect(res).toBe(2);
    expect(removed).toEqual(['r1', 'r2']);
    expect(emitEvent).toHaveBeenCalledWith(
      'reservations:changed',
      { reservation: { id: 'r1', deleted: true } },
      'admin1',
    );
    expect(emitEvent).toHaveBeenCalledWith('tables:changed', {}, 'admin1');
  });

  it('deleteCompletedReservations rejects non-admin', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue({ users: staffUsers() });
    await expect(
      reservationResolvers.deleteCompletedReservations({}, { userId: 'staff1' }),
    ).rejects.toThrow();
    expect(emitEvent).not.toHaveBeenCalled();
  });

  it('createReservation persists client contact fields', async () => {
    const insert = jest.fn().mockResolvedValue(
      mockDoc({
        _id: 'r3',
        user: 'u1',
        date: '2025-06-17',
        time: '19:00',
        guests: 2,
        status: 'confirmed',
        clientName: 'Jane',
        clientPhone: '123456',
        clientEmail: 'jane@example.com',
      }),
    );
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: mockUsersById({
        staff1: { _id: 'staff1', role: 'staff' },
        u1: { _id: 'u1', name: 'John', email: 'john@example.com', role: 'customer' },
      }),
      reservations: { insert },
    });
    const res: any = await reservationResolvers.createReservation(
      {
        date: '2025-06-17',
        time: '19:00',
        guests: 2,
        clientName: 'Jane',
        clientPhone: '123456',
        clientEmail: 'jane@example.com',
      },
      { userId: 'staff1' },
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: 'Jane',
        clientPhone: '123456',
        clientEmail: 'jane@example.com',
      }),
    );
    expect(res.clientName).toBe('Jane');
    expect(emitEvent).toHaveBeenCalledWith(
      'reservations:changed',
      expect.objectContaining({
        reservation: expect.objectContaining({ clientName: 'Jane' }),
      }),
    );
  });
});
