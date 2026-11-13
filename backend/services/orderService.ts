import crypto from 'crypto';
import { getDB } from '../config/rxdb.js';
import { conflictError, validationError } from '../graphql/errors.js';
import { formatOrder } from '../graphql/helpers/formatters.js';
import { emitEvent } from '../sse.js';
import { withTransientRetry } from '../retry.js';

export const ACTIVE_ORDER_STATUSES = ['pending', 'preparing', 'ready'] as const;

export interface RequestedOrderItem {
  menuItemId: string;
  quantity: number;
}

export interface ServerOrderItem {
  menuItem: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderForUserInput {
  userId: string;
  selections: RequestedOrderItem[];
  tableNumber: number;
  paymentMethod?: 'cash' | 'card';
  orderId?: string;
  context?: { userId?: string };
}

export const computeOrderTotal = (items: Array<{ price: number; quantity: number }>): number =>
  Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));

/** Reject a table that already has an active order. */
export const assertTableAvailable = async (
  db: any,
  tableNumber: number,
  excludeOrderId?: string,
): Promise<void> => {
  const allOrders = await db.orders.find().exec();
  const busy = allOrders.some((doc: any) => {
    const order = doc.toJSON();
    if (excludeOrderId && order._id === excludeOrderId) return false;
    return (
      order.tableNumber === tableNumber &&
      ACTIVE_ORDER_STATUSES.includes(order.status as (typeof ACTIVE_ORDER_STATUSES)[number])
    );
  });
  if (busy) throw conflictError('Table is busy');
};

const buildMenuItemMap = async (db: any): Promise<Map<string, any>> => {
  const docs = await db.menuItems.find().exec();
  const map = new Map<string, any>();
  for (const doc of docs) {
    const json = doc.toJSON();
    map.set(json._id, json);
  }
  return map;
};

/** Convert requested menu ids/quantities into server-priced order lines. */
export const buildServerPricedItems = async (
  db: any,
  selections: RequestedOrderItem[],
): Promise<ServerOrderItem[]> => {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw validationError('Order must have at least one item');
  }
  if (selections.length > 50) throw validationError('Order has too many distinct items');

  const quantities = new Map<string, number>();
  for (const selection of selections) {
    if (!selection.menuItemId || typeof selection.menuItemId !== 'string') {
      throw validationError('Each order item needs a menu item id');
    }
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      throw validationError('Item quantity must be at least 1');
    }
    const next = (quantities.get(selection.menuItemId) ?? 0) + selection.quantity;
    if (next > 20) throw validationError('A single item cannot exceed a quantity of 20');
    quantities.set(selection.menuItemId, next);
  }

  const items: ServerOrderItem[] = [];
  for (const [menuItemId, quantity] of quantities) {
    const doc = await db.menuItems.findOne(menuItemId).exec();
    if (!doc) throw validationError(`Menu item ${menuItemId} is no longer available`);
    const item = doc.toJSON();
    if (item.available === false) {
      throw validationError(`"${item.name}" is currently unavailable`);
    }
    if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price <= 0) {
      throw validationError(`"${item.name}" has an invalid current price`);
    }
    items.push({ menuItem: item._id, name: item.name, price: item.price, quantity });
  }
  return items;
};

const formatExistingOrder = async (db: any, id: string) => {
  const doc = await db.orders.findOne(id).exec();
  if (!doc) return null;
  const menuItemMap = await buildMenuItemMap(db);
  return formatOrder(doc.toJSON(), menuItemMap);
};

/**
 * Create an order from live menu data. Prices and names are never taken from
 * the caller. An optional deterministic id makes confirmation retries safe.
 */
export const createOrderForUser = async (input: CreateOrderForUserInput) => {
  if (!Number.isInteger(input.tableNumber) || input.tableNumber < 1) {
    throw validationError('Table number is required');
  }
  const db = await getDB();

  if (input.orderId) {
    const existing = await db.orders.findOne(input.orderId).exec();
    if (existing) {
      const menuItemMap = await buildMenuItemMap(db);
      return formatOrder(existing.toJSON(), menuItemMap);
    }
  }

  const items = await buildServerPricedItems(db, input.selections);
  await assertTableAvailable(db, input.tableNumber);
  const totalAmount = computeOrderTotal(items);
  const orderId = input.orderId ?? crypto.randomUUID();

  const orderDoc = await withTransientRetry(
    () =>
      db.orders.insert({
        _id: orderId,
        user: input.userId,
        items,
        totalAmount,
        tableNumber: input.tableNumber,
        paymentMethod: input.paymentMethod ?? 'cash',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }),
    { operation: 'orders.insert' },
  );

  emitEvent('tables:changed', {}, input.context?.userId ?? input.userId);
  const menuItemMap = await buildMenuItemMap(db);
  const order = await formatOrder(orderDoc.toJSON(), menuItemMap);
  emitEvent('orders:changed', { order }, input.context?.userId ?? input.userId);
  return order;
};

export const getOrderForUser = async (id: string, userId: string) => {
  const db = await getDB();
  const doc = await db.orders.findOne(id).exec();
  if (!doc) return null;
  const order = doc.toJSON();
  if (order.user !== userId) return null;
  const menuItemMap = await buildMenuItemMap(db);
  return formatOrder(order, menuItemMap);
};

export { formatExistingOrder };
