import { getDB } from '../config/rxdb.js';
import { getOrCreateRestaurantSettings } from '../graphql/helpers/formatters.js';
import { validationError } from '../graphql/errors.js';

const ACTIVE_ORDER_STATUSES = ['pending', 'preparing', 'ready'] as const;

export interface AvailabilityInput {
  date: string;
  time: string;
  guests: number;
  tableNumber?: number;
}

export interface AvailabilityResult {
  available: boolean;
  date: string;
  time: string;
  guests: number;
  timeZone: string;
  freeTables: number[];
  tableCount: number;
  capacityVerified: boolean;
  openingHoursVerified: boolean;
  notes: string[];
}

const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Current date/time parts in the restaurant's configured IANA time zone. */
export const nowInTimeZone = (
  timeZone: string,
  now: Date = new Date(),
): { date: string; time: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  };
};

/**
 * Table availability for a requested date/time. The restaurant schema has no
 * capacity or opening-hours fields, so those are explicitly reported as
 * unverified. Confirmed reservations occupy their table for the whole service
 * day, matching the existing `tables` resolver convention.
 */
export const checkReservationAvailability = async (
  input: AvailabilityInput,
  options: { timeZone: string; maxPartySize: number; now?: Date },
): Promise<AvailabilityResult> => {
  const { date, time, guests } = input;
  if (!isValidDate(date)) throw validationError('Reservation date must be YYYY-MM-DD');
  if (!isValidTime(time)) throw validationError('Reservation time must be HH:mm');
  if (!Number.isInteger(guests) || guests < 1 || guests > options.maxPartySize) {
    throw validationError(`Party size must be between 1 and ${options.maxPartySize}`);
  }

  const current = nowInTimeZone(options.timeZone, options.now);
  if (date < current.date) throw validationError('Reservation date cannot be in the past');
  if (date === current.date && time < current.time) {
    throw validationError('Reservation time cannot be in the past');
  }

  const settings = await getOrCreateRestaurantSettings();
  const tableCount = Math.max(1, Number(settings.tableCount) || 10);

  const db = await getDB();
  const ordersByStatus = await Promise.all(
    ACTIVE_ORDER_STATUSES.map((status) =>
      db.orders
        .find({ selector: { status } })
        .exec()
        .then((docs: any[]) => docs.map((doc) => doc.toJSON())),
    ),
  );
  const confirmedReservations = await db.reservations
    .find({ selector: { status: 'confirmed' } })
    .exec()
    .then((docs: any[]) => docs.map((doc) => doc.toJSON()));

  const occupied = new Set<number>();
  // Active orders only affect availability for the current service day.
  if (date === current.date) {
    for (const order of ordersByStatus.flat()) {
      if (typeof order.tableNumber === 'number') occupied.add(order.tableNumber);
    }
  }
  for (const reservation of confirmedReservations) {
    const reservationDate =
      typeof reservation.date === 'string' ? reservation.date.slice(0, 10) : '';
    if (reservationDate === date && typeof reservation.tableNumber === 'number') {
      occupied.add(reservation.tableNumber);
    }
  }

  const freeTables: number[] = [];
  for (let table = 1; table <= tableCount; table += 1) {
    if (!occupied.has(table)) freeTables.push(table);
  }

  const requestedTable = input.tableNumber;
  const available =
    requestedTable !== undefined
      ? requestedTable >= 1 && requestedTable <= tableCount && freeTables.includes(requestedTable)
      : freeTables.length > 0;

  const notes = [
    'Availability uses the configured table count, active orders for today, and confirmed reservations for the requested date.',
    'No per-table seating-capacity data is stored, so party size was not matched to a specific table.',
  ];
  if (!available) {
    notes.push('No free table matches the request under the current booking convention.');
  }

  return {
    available,
    date,
    time,
    guests,
    timeZone: options.timeZone,
    freeTables,
    tableCount,
    capacityVerified: false,
    openingHoursVerified: false,
    notes,
  };
};
