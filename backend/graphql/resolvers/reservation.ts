import crypto from 'crypto';
import moment from 'moment';
import { getDB } from '../../config/rxdb.js';
import { reservationSchema, validate } from '../validation.js';
import { notFoundError, validationError } from '../errors.js';
import { formatReservation } from '../helpers/formatters.js';
import { emitEvent } from '../../sse.js';
import { requireStaffOrAdmin } from '../helpers/auth.js';
import { recordActivity } from '../helpers/activityLog.js';

const genId = () => crypto.randomUUID();

const paginate = <T>(rows: T[], limit?: unknown, offset?: unknown): T[] => {
  const start =
    Number.isFinite(Number(offset)) && Number(offset) >= 0 ? Math.floor(Number(offset)) : 0;
  if (limit === undefined || limit === null) return rows.slice(start);
  const size =
    Number.isFinite(Number(limit)) && Number(limit) >= 0 ? Math.floor(Number(limit)) : rows.length;
  return rows.slice(start, start + size);
};

export const reservationResolvers = {
  reservations: async ({ status, tableNumber, limit, offset }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const db = await getDB();
    const docs = await db.reservations.find(filter).sort('-date').exec();
    // NOTE: doc.populate() is broken with the @basepurpose/rxdb-sqlite adapter
    // (it returns docs with all fields emptied), so user ids are resolved via
    // the findOne fallback inside formatReservation instead.
    const rows = await Promise.all(docs.map((doc: any) => formatReservation(doc.toJSON())));
    return paginate(rows, limit, offset);
  },
  reservation: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) return null;
    return formatReservation(doc.toJSON());
  },
  createReservation: async (
    { date, time, guests, tableNumber, specialRequests, clientName, clientPhone, clientEmail }: any,
    context?: any,
  ) => {
    await requireStaffOrAdmin(context);
    const v = validate(reservationSchema, {
      date,
      time,
      guests,
      tableNumber,
      specialRequests,
      clientName,
      clientPhone,
      clientEmail,
    });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const resDoc = await db.reservations.insert({
      _id: genId(),
      user: context.userId,
      status: 'confirmed',
      createdAt: moment().toISOString(),
      ...v.data,
    });
    const reservation = await formatReservation(resDoc.toJSON());
    emitEvent('reservations:changed', { reservation }, context?.userId);
    emitEvent('tables:changed', {}, context?.userId);
    await recordActivity(context, {
      action: 'create',
      entity: 'reservation',
      entityId: reservation?.id,
      summary: `Reservation for ${reservation?.date ?? date} ${reservation?.time ?? time} created (${reservation?.guests ?? guests} guests)`,
    });
    return reservation;
  },
  updateReservation: async ({ id, ...rest }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const v = validate(reservationSchema.partial(), rest);
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) throw notFoundError('Reservation not found');
    await doc.update({ $set: v.data });
    const updated = await db.reservations.findOne(id).exec();
    const reservation = await formatReservation((updated || doc).toJSON());
    emitEvent('reservations:changed', { reservation }, context?.userId);
    emitEvent('tables:changed', {}, context?.userId);
    await recordActivity(context, {
      action: v.data.status ? 'status' : 'update',
      entity: 'reservation',
      entityId: id,
      summary: `Reservation ${id} ${v.data.status ? `moved to "${v.data.status}"` : 'updated'}`,
    });
    return reservation;
  },
  deleteReservation: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) throw notFoundError('Reservation not found');
    await doc.remove();
    await db.reservations.cleanup(0);
    emitEvent('reservations:changed', { reservation: { id, deleted: true } }, context?.userId);
    emitEvent('tables:changed', {}, context?.userId);
    await recordActivity(context, {
      action: 'delete',
      entity: 'reservation',
      entityId: id,
      summary: `Reservation ${id} deleted`,
    });
    return 'Reservation removed';
  },
  cancelReservation: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.reservations.findOne(id).exec();
    if (!doc) throw notFoundError('Reservation not found');
    await doc.update({ $set: { status: 'cancelled' } });
    const updated = await db.reservations.findOne(id).exec();
    const reservation = await formatReservation((updated || doc).toJSON());
    emitEvent('reservations:changed', { reservation }, context?.userId);
    emitEvent('tables:changed', {}, context?.userId);
    await recordActivity(context, {
      action: 'status',
      entity: 'reservation',
      entityId: id,
      summary: `Reservation ${id} cancelled`,
    });
    return reservation;
  },
};
