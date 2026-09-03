import Order from '../../models/Order.js';
import Reservation from '../../models/Reservation.js';
import MenuItem from '../../models/MenuItem.js';
import Category from '../../models/Category.js';
import User from '../../models/User.js';
import { getOrCreateRestaurantSettings } from '../helpers/formatters.js';
import { requireAuth } from '../helpers/auth.js';
import { formatOrder } from '../helpers/formatters.js';

export const dashboardResolvers = {
  dashboardStats: async (_args: any, context?: any) => {
    await requireAuth(context);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      preparingOrders,
      completedOrders,
      cancelledOrders,
      totalReservations,
      confirmedReservations,
      completedReservations,
      cancelledReservations,
      totalMenuItems,
      availableMenuItems,
      totalUsers,
      totalCategories,
      settings,
      totalRevenueAgg,
      todayOrders,
      todayReservations,
      recentOrdersDocs,
      ordersByStatusAgg,
      reservationsByStatusAgg,
      busyOrders,
      busyReservations,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'preparing' }),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'cancelled' }),
      Reservation.countDocuments(),
      Reservation.countDocuments({ status: 'confirmed' }),
      Reservation.countDocuments({ status: 'completed' }),
      Reservation.countDocuments({ status: 'cancelled' }),
      MenuItem.countDocuments(),
      MenuItem.countDocuments({ available: true }),
      User.countDocuments(),
      Category.countDocuments(),
      getOrCreateRestaurantSettings(),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Reservation.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.find()
        .populate('user', 'name email role _id')
        .populate('items.menuItem')
        .sort('-createdAt')
        .limit(5)
        .lean(),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Reservation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.find({
        status: { $in: ['pending', 'preparing'] },
        tableNumber: { $exists: true, $ne: null },
      })
        .select('tableNumber')
        .lean(),
      Reservation.find({ status: 'confirmed', tableNumber: { $exists: true, $ne: null } })
        .select('tableNumber')
        .lean(),
    ]);

    const totalTables = settings.tableCount || 10;
    // compute busy distinct tables
    const busySet = new Set<number>();
    busyOrders.forEach((o: any) => busySet.add(o.tableNumber));
    busyReservations.forEach((r: any) => {
      if (!busySet.has(r.tableNumber)) busySet.add(r.tableNumber);
    });
    const busyTables = busySet.size;
    const freeTables = Math.max(totalTables - busyTables, 0);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    const recentOrders = (recentOrdersDocs as any[]).map(formatOrder);

    const ordersByStatus = ordersByStatusAgg.map((item: any) => ({
      status: item._id,
      count: item.count,
    }));
    const reservationsByStatus = reservationsByStatusAgg.map((item: any) => ({
      status: item._id,
      count: item.count,
    }));

    return {
      totalOrders,
      pendingOrders,
      preparingOrders,
      completedOrders,
      cancelledOrders,
      totalReservations,
      confirmedReservations,
      completedReservations,
      cancelledReservations,
      totalMenuItems,
      availableMenuItems,
      totalUsers,
      totalCategories,
      totalTables,
      busyTables,
      freeTables,
      totalRevenue,
      todayOrders,
      todayReservations,
      recentOrders,
      ordersByStatus,
      reservationsByStatus,
    };
  },
};
