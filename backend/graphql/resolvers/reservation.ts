import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { reservationSchema, validate } from '../validation.js';
import { formatReservation } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

const genId = () => crypto.randomUUID();

export const reservationResolvers = {
  reservations: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const db = await getDB();
    const docs = await db.reservations.find(filter).sort('-date').exec();
    return docs.map((doc: any) => formatReservation(doc.toJSON()));
  },
  reservation: async ({ id }: any) => {
    const db = await getDB();
    const doc = await db.reservations.findOne({ _id: id }).exec();
    if (!doc) return null;
    return formatReservation(doc.toJSON());
  },
  createReservation: async ({ date, time, guests, tableNumber, specialRequests }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const v = validate(reservationSchema, { date, time, guests, tableNumber, specialRequests });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const resDoc = await db.reservations.insert({
      _id: genId(),
      user: context.userId,
      ...v.data,
    });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    const res = resDoc.toJSON();
    return { ...res, id: res._id };
  },
  updateReservation: async ({ id, ...rest }: any) => {
    const v = validate(reservationSchema.partial(), rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.reservations.findOne({ _id: id }).exec();
    if (!doc) throw new Error('Reservation not found');
    await doc.update({ $set: v.data });
    emitEvent('reservations:changed');
    emitEvent('tables:change');
    return formatReservation(doc.toJSON());
  },
  deleteReservation: async ({ id }: any) => {
    const db = await getDB();
    const doc = await db.reservations.findOne({ _id: id }).exec();
    if (!doc) throw new Error('Reservation not found');
    await doc.remove();
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return 'Reservation removed';
  },
  cancelReservation: async ({ id }: any) => {
    const db = await getDB();
    const doc = await db.reservations.findOne({ _id: id }).exec();
    if (!doc) throw new Error('Reservation not found');
    await doc.update({ $set: { status: 'cancelled' } });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    const res = doc.toJSON();
    return { ...res, id: res._id };
  },
};
