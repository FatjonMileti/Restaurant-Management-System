import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { createOrderSchema, updateOrderSchema, validate } from '../validation.js';
import { formatOrder } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

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
  orders: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const db = await getDB();
    const [docs, menuItemMap] = await Promise.all([
      db.orders.find(filter).sort({ createdAt: -1 }).exec(),
      buildMenuItemMap(db),
    ]);
    return docs.map((doc: any) => formatOrder(doc.toJSON(), menuItemMap));
  },

  order: async ({ id }: any) => {
    const db = await getDB();
    const [doc, menuItemMap] = await Promise.all([
      db.orders.findOne(id).exec(),
      buildMenuItemMap(db),
    ]);
    if (!doc) return null;
    return formatOrder(doc.toJSON(), menuItemMap);
  },

  createOrder: async ({ items, tableNumber, paymentMethod }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const v = validate(createOrderSchema, { items, tableNumber, paymentMethod });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    if (v.data.tableNumber) {
      const allOrders = await db.orders.find().exec();
      const busy = allOrders.some((d: any) => {
        const o = d.toJSON();
        return o.tableNumber === v.data.tableNumber && ['pending', 'preparing', 'ready'].includes(o.status);
      });
      if (busy) throw new Error('Table is busy');
    }
    const totalAmount = v.data.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    const orderDoc = await db.orders.insert({
      _id: genId(),
      user: context.userId,
      items: v.data.items,
      totalAmount,
      tableNumber: v.data.tableNumber,
      paymentMethod: v.data.paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    const order = orderDoc.toJSON();
    return { ...order, id: order._id };
  },

  updateOrder: async ({ id, ...rest }: any) => {
    const v = validate(updateOrderSchema, rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const updates: any = { ...v.data };
    if (v.data.items) {
      updates.totalAmount = v.data.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    }
    if (v.data.tableNumber) {
      const allOrders = await db.orders.find().exec();
      const busy = allOrders.some((d: any) => {
        const o = d.toJSON();
        return o.tableNumber === v.data.tableNumber && o._id !== id && ['pending', 'preparing'].includes(o.status);
      });
      if (busy) throw new Error('Table is busy');
    }
    const doc = await db.orders.findOne(id).exec();
    if (!doc) return null;
    await doc.update({ $set: updates });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    const updated = await db.orders.findOne(id).exec();
    const order = updated?.toJSON() || doc.toJSON();
    return { ...order, id: order._id };
  },

  deleteOrder: async ({ id }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const db = await getDB();
    const userDoc = await db.users.findOne({ selector: { _id: context.userId } }).exec();
    const user = userDoc?.toJSON();
    if (!user) throw new Error('User not found');
    const isAdmin = user.role === 'admin';
    if (!isAdmin) return null;
    const doc = await db.orders.findOne(id).exec();
    if (!doc) throw new Error('Order not found');
    await doc.remove();
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return 'Order removed';
  },

  updateOrderStatus: async ({ id, status }: any) => {
    const db = await getDB();
    const doc = await db.orders.findOne(id).exec();
    if (!doc) return null;
    await doc.update({ $set: { status } });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    const updated = await db.orders.findOne(id).exec();
    const order = updated?.toJSON() || doc.toJSON();
    return { ...order, id: order._id };
  },
};
