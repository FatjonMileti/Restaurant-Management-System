import crypto from 'crypto';
import moment from 'moment';
import { getDB } from '../../config/rxdb.js';
import { createOrderSchema, updateOrderSchema, validate } from '../validation.js';
import { authError, conflictError, notFoundError, validationError } from '../errors.js';
import { formatOrder } from '../helpers/formatters.js';
import { emitEvent } from '../../sse.js';
import { requireAdmin, requireStaffOrAdmin } from '../helpers/auth.js';

const genId = () => crypto.randomUUID();

const buildMenuItemMap = async (db: any): Promise<Map<string, any>> => {
  const docs = await db.menuItems.find().exec();
  const map = new Map<string, any>();
  docs.forEach((doc: any) => {
    const json = doc.toJSON();
    map.set(json._id, json);
  });
  return map;
};

export const orderResolvers = {
  orders: async ({ status, tableNumber }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const db = await getDB();
    const [docs, menuItemMap] = await Promise.all([
      db.orders.find(filter).sort({ createdAt: -1 }).exec(),
      buildMenuItemMap(db),
    ]);
    return Promise.all(docs.map((doc: any) => formatOrder(doc.toJSON(), menuItemMap)));
  },

  order: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const [doc, menuItemMap] = await Promise.all([
      db.orders.findOne(id).exec(),
      buildMenuItemMap(db),
    ]);
    if (!doc) return null;
    return formatOrder(doc.toJSON(), menuItemMap);
  },

  createOrder: async ({ items, tableNumber, paymentMethod }: any, context?: any) => {
    if (!context?.userId) throw authError();
    const v = validate(createOrderSchema, { items, tableNumber, paymentMethod });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const allOrders = await db.orders.find().exec();
    const busy = allOrders.some((d: any) => {
      const o = d.toJSON();
      return (
        o.tableNumber === v.data.tableNumber && ['pending', 'preparing', 'ready'].includes(o.status)
      );
    });
    if (busy) throw conflictError('Table is busy');
    const totalAmount = v.data.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    const orderDoc = await db.orders.insert({
      _id: genId(),
      user: context.userId,
      items: v.data.items,
      totalAmount,
      tableNumber: v.data.tableNumber,
      paymentMethod: v.data.paymentMethod ?? 'cash',
      status: 'pending',
      createdAt: moment().toISOString(),
    });
    emitEvent('tables:changed');
    // Return the formatted order (populated user + menuItem objects), not the
    // raw doc: items store menuItem as a plain id string, which cannot resolve
    // the `menuItem { id }` selection ("Cannot return null for non-nullable
    // field MenuItem.id").
    const menuItemMap = await buildMenuItemMap(db);
    const order = await formatOrder(orderDoc.toJSON(), menuItemMap);
    emitEvent('orders:changed', { order });
    return order;
  },

  updateOrder: async ({ id, ...rest }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const v = validate(updateOrderSchema, rest);
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const updates: any = { ...v.data };
    if (v.data.items) {
      updates.totalAmount = v.data.items.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity,
        0,
      );
    }
    if (v.data.tableNumber) {
      const allOrders = await db.orders.find().exec();
      const busy = allOrders.some((d: any) => {
        const o = d.toJSON();
        return (
          o.tableNumber === v.data.tableNumber &&
          o._id !== id &&
          ['pending', 'preparing'].includes(o.status)
        );
      });
      if (busy) throw conflictError('Table is busy');
    }
    const doc = await db.orders.findOne(id).exec();
    if (!doc) return null;
    await doc.update({ $set: updates });
    const updated = await db.orders.findOne(id).exec();
    const menuItemMap = await buildMenuItemMap(db);
    const order = await formatOrder((updated || doc).toJSON(), menuItemMap);
    emitEvent('orders:changed', { order });
    emitEvent('tables:changed');
    return order;
  },

  deleteOrder: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const doc = await db.orders.findOne(id).exec();
    if (!doc) throw notFoundError('Order not found');
    await doc.remove();
    await db.orders.cleanup(0);
    emitEvent('orders:changed', { order: { id, deleted: true } });
    return 'Order removed';
  },

  updateOrderStatus: async ({ id, status }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.orders.findOne(id).exec();
    if (!doc) return null;
    await doc.update({ $set: { status } });
    const updated = await db.orders.findOne(id).exec();
    const menuItemMap = await buildMenuItemMap(db);
    const order = await formatOrder((updated || doc).toJSON(), menuItemMap);
    emitEvent('orders:changed', { order });
    emitEvent('tables:changed');
    return order;
  },
};
