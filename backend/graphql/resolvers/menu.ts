import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { menuItemSchema, validate } from '../validation.js';
import { requireAdmin, requireStaffOrAdmin } from '../helpers/auth.js';
import { formatMenuItem } from '../helpers/formatters.js';
import { notFoundError, validationError } from '../errors.js';
import { emitEvent } from '../../sse.js';
import { recordActivity } from '../helpers/activityLog.js';
import { seed } from '../../seeds.js';

const genId = () => crypto.randomUUID();

const paginate = <T>(rows: T[], limit?: unknown, offset?: unknown): T[] => {
  const start =
    Number.isFinite(Number(offset)) && Number(offset) >= 0 ? Math.floor(Number(offset)) : 0;
  if (limit === undefined || limit === null) return rows.slice(start);
  const size =
    Number.isFinite(Number(limit)) && Number(limit) >= 0 ? Math.floor(Number(limit)) : rows.length;
  return rows.slice(start, start + size);
};

export const menuResolvers = {
  menuItems: async ({ category, available, limit, offset }: any) => {
    const filter: any = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available;
    const db = await getDB();
    // if menuItems length is zero seed it
    // Remove on production
    if ((await db.menuItems.count().exec()) === 0) {
      await seed();
    }
    const docs = await db.menuItems.find(filter).sort('category').exec();
    return paginate(docs.map(formatMenuItem), limit, offset);
  },

  menuItem: async ({ id }: any, context?: any) => {
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const doc = await db.menuItems.findOne(id).exec();
    if (!doc) return null;
    return formatMenuItem(doc.toJSON());
  },

  createMenuItem: async ({ name, description, price, category, image }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(menuItemSchema, { name, description, price, category, image });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const item = await db.menuItems.insert({
      _id: genId(),
      available: true,
      ...v.data,
      updatedAt: new Date().toISOString(),
    });
    const menuItem = formatMenuItem(item);
    emitEvent('menu:changed', { menuItem }, context?.userId);
    await recordActivity(context, {
      action: 'create',
      entity: 'menuItem',
      entityId: menuItem?.id,
      summary: `Menu item "${menuItem?.name}" created`,
    });
    return menuItem;
  },

  updateMenuItem: async ({ id, ...rest }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(menuItemSchema.partial(), rest);
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const existing = await db.menuItems.findOne(id).exec();
    if (!existing) throw notFoundError('Menu item not found');
    await existing.update({ $set: { ...v.data, updatedAt: new Date().toISOString() } });
    const updated = await db.menuItems.findOne(id).exec();
    const menuItem = formatMenuItem(updated?.toJSON() || existing.toJSON());
    emitEvent('menu:changed', { menuItem }, context?.userId);
    await recordActivity(context, {
      action: 'update',
      entity: 'menuItem',
      entityId: menuItem?.id,
      summary: `Menu item "${menuItem?.name}" updated`,
    });
    return menuItem;
  },

  deleteMenuItem: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const item = await db.menuItems.findOne(id).exec();
    if (!item) throw notFoundError('Menu item not found');
    const removedName = item.toJSON()?.name ?? id;
    await item.remove();
    await db.menuItems.cleanup(0);
    emitEvent('menu:changed', { menuItem: { id, deleted: true } }, context?.userId);
    await recordActivity(context, {
      action: 'delete',
      entity: 'menuItem',
      entityId: id,
      summary: `Menu item "${removedName}" deleted`,
    });
    return 'Menu item removed';
  },
};
