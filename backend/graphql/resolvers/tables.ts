import Order from '../../models/Order.js';
import Reservation from '../../models/Reservation.js';
import { getOrCreateRestaurantSettings } from '../helpers/formatters.js';

export const tablesResolvers = {
  tables: async () => {
    const settings = await getOrCreateRestaurantSettings();
    const count = settings.tableCount || 10;
    const [busyOrders, confirmedReservations] = await Promise.all([
      Order.find({
        status: { $in: ['pending', 'preparing'] },
        tableNumber: { $exists: true, $ne: null },
      })
        .select('tableNumber')
        .lean(),
      Reservation.find({
        status: 'confirmed',
        tableNumber: { $exists: true, $ne: null },
      })
        .select('tableNumber')
        .lean(),
    ]);
    const orderMap = new Map<number, any>();
    busyOrders.forEach((o: any) => {
      if (o.tableNumber) orderMap.set(o.tableNumber, { type: 'order', doc: o });
    });
    const reservationMap = new Map<number, any>();
    confirmedReservations.forEach((r: any) => {
      if (r.tableNumber && !orderMap.has(r.tableNumber))
        reservationMap.set(r.tableNumber, { type: 'reservation', doc: r });
    });
    const result: any[] = [];
    for (let i = 1; i <= count; i++) {
      if (orderMap.has(i)) {
        const occupied = orderMap.get(i);
        result.push({
          number: i,
          isBusy: true,
          busyType: 'order',
          occupiedBy: occupied.doc._id.toString(),
        });
      } else if (reservationMap.has(i)) {
        const occupied = reservationMap.get(i);
        result.push({
          number: i,
          isBusy: true,
          busyType: 'reservation',
          occupiedBy: occupied.doc._id.toString(),
        });
      } else {
        result.push({ number: i, isBusy: false, busyType: null, occupiedBy: null });
      }
    }
    return result;
  },
};
