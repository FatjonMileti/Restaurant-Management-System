import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { reservationSchema, validate } from '../validation.js';
import { formatReservation } from '../helpers/formatters.js';
import { emitEvent } from '../../sse.js';
import { requireStaffOrAdmin } from '../helpers/auth.js';

const genId = () => crypto.randomUUID();

export const reservationResolvers = {
  reservations: async ({ status, tableNumber }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const db = await getDB();
    const docs = await db.reservations.find(filter).sort('-date').exec();
    // NOTE: doc.populate() is broken with the @basepurpose/rxdb-sqlite adapter
    // (it returns docs with all fields emptied), so user ids are resolved via
    // the findOne fallback inside formatReservation instead.
    return Promise.all(docs.map((doc: any) => formatReservation(doc.toJSON())));
  },
  reservation: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) return null;
    return formatReservation(doc.toJSON());
  },
  createReservation: async (
    { date, time, guests, tableNumber, specialRequests }: any,
    context?: any,
  ) => {
    await requireStaffOrAdmin(context);
    const v = validate(reservationSchema, { date, time, guests, tableNumber, specialRequests });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const resDoc = await db.reservations.insert({
      _id: genId(),
      user: context.userId,
      status: 'confirmed',
      ...v.data,
    });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return formatReservation(resDoc.toJSON());
  },
  updateReservation: async ({ id, ...rest }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const v = validate(reservationSchema.partial(), rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) throw new Error('Reservation not found');
    await doc.update({ $set: v.data });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    const updated = await db.reservations.findOne(id).exec();
    return formatReservation((updated || doc).toJSON());
  },
  deleteReservation: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) throw new Error('Reservation not found');
    await doc.remove();
    await db.reservations.cleanup(0);
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return 'Reservation removed';
  },
  cancelReservation: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) throw new Error('Reservation not found');
    await doc.update({ $set: { status: 'cancelled' } });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    const updated = await db.reservations.findOne(id).exec();
    return formatReservation((updated || doc).toJSON());
  },
};
