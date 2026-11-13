import crypto from 'crypto';
import { getDB } from '../config/rxdb.js';
import { validationError } from '../graphql/errors.js';
import { formatReservation } from '../graphql/helpers/formatters.js';
import { reservationSchema, validate } from '../graphql/validation.js';
import { emitEvent } from '../sse.js';
import { withTransientRetry } from '../retry.js';

export interface CreateReservationForUserInput {
  userId: string;
  date: string;
  time: string;
  guests: number;
  tableNumber?: number;
  specialRequests?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  reservationId?: string;
  context?: { userId?: string };
}

/**
 * Customer-initiated reservation persistence used by the confirmed AI action.
 * Ownership always comes from the authenticated user id; contact fields are
 * only metadata. A deterministic id makes retries idempotent.
 */
export const createReservationForUser = async (input: CreateReservationForUserInput) => {
  const validated = validate(reservationSchema, {
    date: input.date,
    time: input.time,
    guests: input.guests,
    tableNumber: input.tableNumber,
    specialRequests: input.specialRequests,
    clientName: input.contactName,
    clientPhone: input.contactPhone,
    clientEmail: input.contactEmail,
  });
  if (!validated.success) throw validationError(validated.errors.join(', '));

  const db = await getDB();
  if (input.reservationId) {
    const existing = await db.reservations.findOne(input.reservationId).exec();
    if (existing) return formatReservation(existing.toJSON());
  }

  const reservationId = input.reservationId ?? crypto.randomUUID();
  const resDoc = await withTransientRetry(
    () =>
      db.reservations.insert({
        _id: reservationId,
        user: input.userId,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        ...validated.data,
      }),
    { operation: 'reservations.insert' },
  );

  const reservation = await formatReservation(resDoc.toJSON());
  emitEvent('reservations:changed', { reservation }, input.context?.userId ?? input.userId);
  emitEvent('tables:changed', {}, input.context?.userId ?? input.userId);
  return reservation;
};

export const getReservationForUser = async (id: string, userId: string) => {
  const db = await getDB();
  const doc = await db.reservations.findOne(id).exec();
  if (!doc) return null;
  const json = doc.toJSON();
  if (json.user !== userId) return null;
  return formatReservation(json);
};
