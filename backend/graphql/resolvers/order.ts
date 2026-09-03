import MenuItem from '../../models/MenuItem.js';
import Order from '../../models/Order.js';
import { createOrderSchema, updateOrderSchema, validate } from '../validation.js';
import { formatOrder } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

export const orderResolvers = {
  orders: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const orders = await Order.find(filter)
      .populate('user', 'name email role _id')
      .populate('items.menuItem')
      .sort('-createdAt')
      .lean();
    return (orders as any[]).map((o: any) => {
      // when lean, user is plain object; formatOrder handles it
      return formatOrder(o);
    });
  },

  order: async ({ id }: any) => {
    const doc: any = await Order.findById(id)
      .populate('user', 'name email role _id')
      .populate('items.menuItem')
      .lean();
    if (!doc) return null;
    return formatOrder(doc);
  },

  createOrder: async ({ items, tableNumber, paymentMethod }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const v = validate(createOrderSchema, { items, tableNumber, paymentMethod });
    if (!v.success) throw new Error(v.errors.join(', '));
    const menuItemIds = v.data.items.map((i) => i.menuItem);
    const existingItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
    if (existingItems.length !== menuItemIds.length)
      throw new Error('One or more menu items not found');
    if (v.data.tableNumber) {
      const busyTable = await Order.findOne({
        tableNumber: v.data.tableNumber,
        status: { $in: ['pending', 'preparing'] },
      }).lean();
      if (busyTable) throw new Error('Table is busy');
    }
    const totalAmount = v.data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await Order.create({
      user: context.userId,
      items: v.data.items,
      totalAmount,
      tableNumber: v.data.tableNumber,
      paymentMethod: v.data.paymentMethod,
    });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    const obj: any = order.toObject();
    return { ...obj, id: obj._id.toString() };
  },

  updateOrder: async ({ id, ...rest }: any) => {
    const v = validate(updateOrderSchema, rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const updates: any = { ...v.data };
    if (v.data.items) {
      updates.totalAmount = v.data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
    if (v.data.tableNumber) {
      const busyTable = await Order.findOne({
        tableNumber: v.data.tableNumber,
        status: { $in: ['pending', 'preparing'] },
        _id: { $ne: id },
      }).lean();
      if (busyTable) throw new Error('Table is busy');
    }
    const order: any = await Order.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();
    if (!order) return null;
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return { ...order, id: order._id.toString() };
  },

  deleteOrder: async ({ id }: any) => {
    const order = await Order.findByIdAndDelete(id);
    if (!order) throw new Error('Order not found');
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return 'Order removed';
  },

  updateOrderStatus: async ({ id, status }: any) => {
    const order: any = await Order.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!order) return null;
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return { ...order, id: order._id.toString() };
  },
};
