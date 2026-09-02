import Reservation from '../../models/Reservation.js';
import { reservationSchema, validate } from '../validation.js';
import { formatReservation } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

export const reservationResolvers = {
  reservations: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const docs = await Reservation.find(filter)
      .populate('user', 'name email role _id')
      .sort('-date')
      .lean();
    return docs.map(formatReservation);
  },

  reservation: async ({ id }: any) => {
    const doc: any = await Reservation.findById(id).populate('user', 'name email role _id').lean();
    if (!doc) return null;
    return formatReservation(doc);
  },

  createReservation: async ({ date, time, guests, tableNumber, specialRequests }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const v = validate(reservationSchema, { date, time, guests, tableNumber, specialRequests });
    if (!v.success) throw new Error(v.errors.join(', '));
    const reservation = await Reservation.create({ user: context.userId, ...v.data });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    const obj: any = reservation.toObject();
    return { ...obj, id: obj._id.toString() };
  },

  updateReservation: async ({ id, ...rest }: any) => {
    const v = validate(reservationSchema.partial(), rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const reservation: any = await Reservation.findByIdAndUpdate(id, v.data, {
      new: true,
      runValidators: true,
    }).lean();
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    if (!reservation) return null;
    return { ...reservation, id: reservation._id.toString() };
  },

  deleteReservation: async ({ id }: any) => {
    const res = await Reservation.findByIdAndDelete(id);
    if (!res) throw new Error('Reservation not found');
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return 'Reservation removed';
  },

  cancelReservation: async ({ id }: any) => {
    const res = await Reservation.findById(id);
    if (!res) throw new Error('Reservation not found');
    res.status = 'cancelled';
    await res.save();
    const obj: any = res.toObject();
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return { ...obj, id: obj._id.toString() };
  },
};
