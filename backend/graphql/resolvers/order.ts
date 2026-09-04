import { getDB } from '../../config/rxdb';
import { createOrderSchema, updateOrderSchema, validate } from '../validation.js';
import { formatOrder } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

export const orderResolvers = {
  orders: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const db = await getDB();
    const docs = await db.orders.find(filter).sort({ createdAt: -1 }).exec();
    return docs.map((doc: any) => formatOrder(doc.toJSON()));
  },

  order: async ({ id }: any) => {
    const db = await getDB();
    const doc = await db.orders.findOne({ _id: id }).exec();
    if (!doc) return null;
    return formatOrder(doc.toJSON());
  },

  createOrder: async ({ items, tableNumber, paymentMethod }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const v = validate(createOrderSchema, { items, tableNumber, paymentMethod });
    if (!v.success) throw new Error(v.errors.join(', '));
    // assume menu items validation elsewhere; skip for brevity
    if (v.data.tableNumber) {
      const busy = await db.orders.findOne({ tableNumber: v.data.tableNumber, status: { $in: ['pending', 'preparing'] } }).exec();
      if (busy) throw new Error('Table is busy');
    }
    const totalAmount = v.data.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    const db = await getDB();
    const orderDoc = await db.orders.insert({
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
      const busy = await db.orders.findOne({ tableNumber: v.data.tableNumber, status: { $in: ['pending', 'preparing'] }, _id: { $ne: id } }).exec();
      if (busy) throw new Error('Table is busy');
    }
    const doc = await db.orders.findOne({ _id: id }).exec();
    if (!doc) return null;
    await doc.update({ $set: updates });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    const order = doc.toJSON();
    return { ...order, id: order._id };
  },

  deleteOrder: async ({ id }: any) => {
    const db = await getDB();
    const doc = await db.orders.findOne({ _id: id }).exec();
    if (!doc) throw new Error('Order not found');
    await doc.remove();
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return 'Order removed';
  },

  updateOrderStatus: async ({ id, status }: any) => {
    const db = await getDB();
    const doc = await db.orders.findOne({ _id: id }).exec();
    if (!doc) return null;
    await doc.update({ $set: { status } });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    const order = doc.toJSON();
    return { ...order, id: order._id };
  },
};
