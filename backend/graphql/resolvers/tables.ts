import { getDB } from '../../config/rxdb.js';
import { requireStaffOrAdmin } from '../helpers/auth.js';
import { getOrCreateRestaurantSettings } from '../helpers/formatters.js';

// Only these statuses can occupy a table; completed/cancelled docs are free.
const ACTIVE_ORDER_STATUSES = ['pending', 'preparing'];
const ACTIVE_RESERVATION_STATUS = 'confirmed';

export const tablesResolvers = {
  tables: async (_args: any, context: any) => {
    await requireStaffOrAdmin(context);
    const settings = await getOrCreateRestaurantSettings();
    const count = settings.tableCount || 10;

    const db = await getDB();
    // $in is unsupported by the RxDB SQLite adapter, so fetch one equality
    // query per active status instead of loading entire collections.
    const [pendingOrders, preparingOrders, confirmedReservations] = await Promise.all([
      db.orders
        .find({ selector: { status: ACTIVE_ORDER_STATUSES[0] } })
        .exec()
        .then((docs: any[]) => docs.map((d) => d.toJSON())),
      db.orders
        .find({ selector: { status: ACTIVE_ORDER_STATUSES[1] } })
        .exec()
        .then((docs: any[]) => docs.map((d) => d.toJSON())),
      db.reservations
        .find({ selector: { status: ACTIVE_RESERVATION_STATUS } })
        .exec()
        .then((docs: any[]) => docs.map((d) => d.toJSON())),
    ]);

    // Single lookup: tableNumber -> occupant. Orders win over reservations.
    const occupied = new Map<number, { busyType: string; occupiedBy: string | null }>();
    for (const docs of [pendingOrders, preparingOrders]) {
      for (const doc of docs) {
        const o = doc;
        if (o.tableNumber == null) continue;
        occupied.set(o.tableNumber, { busyType: 'order', occupiedBy: o._id ?? null });
      }
    }
    for (const doc of confirmedReservations) {
      const r = doc;
      if (r.tableNumber == null || occupied.has(r.tableNumber)) continue;
      occupied.set(r.tableNumber, { busyType: 'reservation', occupiedBy: r._id ?? null });
    }

    const result: any[] = new Array(count);
    for (let i = 1; i <= count; i++) {
      const occupant = occupied.get(i);
      result[i - 1] = occupant
        ? { number: i, isBusy: true, ...occupant }
        : { number: i, isBusy: false, busyType: null, occupiedBy: null };
    }
    return result;
  },
};
