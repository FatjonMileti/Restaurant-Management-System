import { getDB } from '../../config/rxdb.js';
import { requireAuth } from '../helpers/auth.js';
import { formatOrder } from '../helpers/formatters.js';
import { getOrCreateRestaurantSettings } from '../helpers/formatters.js';

export const dashboardResolvers = {
  dashboardStats: async (_args: any, context?: any) => {
    await requireAuth(context);

    const db = await getDB();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      allOrders,
      allReservations,
      allMenuItems,
      allUsers,
      allCategories,
      settings,
    ] = await Promise.all([
      db.orders.find().exec(),
      db.reservations.find().exec(),
      db.menuItems.find().exec(),
      db.users.find().exec(),
      db.categories.find().exec(),
      getOrCreateRestaurantSettings(),
    ]);

    const orders = allOrders.map((d: any) => d.toJSON());
    const reservations = allReservations.map((d: any) => d.toJSON());
    const menuItems = allMenuItems.map((d: any) => d.toJSON());

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
    const preparingOrders = orders.filter((o: any) => o.status === 'preparing').length;
    const completedOrders = orders.filter((o: any) => o.status === 'completed').length;
    const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;
    const totalReservations = reservations.length;
    const confirmedReservations = reservations.filter((r: any) => r.status === 'confirmed').length;
    const completedReservations = reservations.filter((r: any) => r.status === 'completed').length;
    const cancelledReservations = reservations.filter((r: any) => r.status === 'cancelled').length;
    const totalMenuItems = menuItems.length;
    const availableMenuItems = menuItems.filter((m: any) => m.available).length;
    const totalUsers = allUsers.length;
    const totalCategories = allCategories.length;

    const totalTables = settings.tableCount || 10;

    const busyOrderTableNumbers = new Set<number>();
    orders
      .filter((o: any) => ['pending', 'preparing'].includes(o.status) && o.tableNumber)
      .forEach((o: any) => busyOrderTableNumbers.add(o.tableNumber));

    const busyReservationTableNumbers = new Set<number>();
    reservations
      .filter((r: any) => r.status === 'confirmed' && r.tableNumber)
      .forEach((r: any) => {
        if (!busyOrderTableNumbers.has(r.tableNumber)) busyReservationTableNumbers.add(r.tableNumber);
      });

    const busyTables = busyOrderTableNumbers.size + busyReservationTableNumbers.size;
    const freeTables = Math.max(totalTables - busyTables, 0);

    const totalRevenue = orders
      .filter((o: any) => o.status === 'completed')
      .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    const todayOrders = orders.filter((o: any) => o.createdAt && new Date(o.createdAt) >= startOfToday).length;
    const todayReservations = reservations.filter((r: any) => r.createdAt && new Date(r.createdAt) >= startOfToday).length;

    const recentOrdersDocs = await db.orders.find().sort('-createdAt').limit(5).exec();
    const recentOrders = recentOrdersDocs.map((d: any) => formatOrder(d.toJSON()));

    const orderStatusMap = new Map<string, number>();
    orders.forEach((o: any) => {
      orderStatusMap.set(o.status, (orderStatusMap.get(o.status) || 0) + 1);
    });
    const ordersByStatus = Array.from(orderStatusMap.entries()).map(([status, count]) => ({ status, count }));

    const reservationStatusMap = new Map<string, number>();
    reservations.forEach((r: any) => {
      reservationStatusMap.set(r.status, (reservationStatusMap.get(r.status) || 0) + 1);
    });
    const reservationsByStatus = Array.from(reservationStatusMap.entries()).map(([status, count]) => ({ status, count }));

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
