import { getDB } from '../../config/rxdb.js';
import { getOrCreateRestaurantSettings } from '../helpers/formatters.js';

export const tablesResolvers = {
  tables: async () => {
    const settings = await getOrCreateRestaurantSettings();
    const count = settings.tableCount || 10;

    const db = await getDB();
    const [allOrders, allReservations] = await Promise.all([
      db.orders.find().exec(),
      db.reservations.find().exec(),
    ]);

    const orders = allOrders.map((d: any) => d.toJSON());
    const reservations = allReservations.map((d: any) => d.toJSON());

    const busyOrderTableNumbers = new Set<number>();
    const busyOrderDocs = new Map<number, any>();
    orders
      .filter((o: any) => ['pending', 'preparing'].includes(o.status) && o.tableNumber)
      .forEach((o: any) => {
        busyOrderTableNumbers.add(o.tableNumber);
        busyOrderDocs.set(o.tableNumber, o);
      });

    const busyReservationTableNumbers = new Set<number>();
    const busyReservationDocs = new Map<number, any>();
    reservations
      .filter((r: any) => r.status === 'confirmed' && r.tableNumber)
      .forEach((r: any) => {
        if (!busyOrderTableNumbers.has(r.tableNumber)) {
          busyReservationTableNumbers.add(r.tableNumber);
          busyReservationDocs.set(r.tableNumber, r);
        }
      });

    const result: any[] = [];
    for (let i = 1; i <= count; i++) {
      if (busyOrderTableNumbers.has(i)) {
        const doc = busyOrderDocs.get(i);
        result.push({
          number: i,
          isBusy: true,
          busyType: 'order',
          occupiedBy: doc._id || null,
        });
      } else if (busyReservationTableNumbers.has(i)) {
        const doc = busyReservationDocs.get(i);
        result.push({
          number: i,
          isBusy: true,
          busyType: 'reservation',
          occupiedBy: doc._id || null,
        });
      } else {
        result.push({ number: i, isBusy: false, busyType: null, occupiedBy: null });
      }
    }
    return result;
  },
};
