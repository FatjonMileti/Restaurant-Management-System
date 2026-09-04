import { getDB } from '../../config/rxdb.js';
import { menuItemSchema, validate } from '../validation.js';
import { requireAdmin } from '../helpers/auth.js';
import { formatMenuItem } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

export const menuResolvers = {
  menuItems: async ({ category, available }: any) => {
    const filter: any = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available;
    const db = await getDB();
    const docs = await db.menuItems.find(filter).sort('category').exec();
    return docs.map(formatMenuItem);
  },

  menuItem: async ({ id }: any) => {
    const doc = await MenuItem.findById(id).lean();
    return formatMenuItem(doc);
  },

  createMenuItem: async ({ name, description, price, category, image }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(menuItemSchema, { name, description, price, category, image });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const item = await db.menuItems.insert(v.data);
    emitEvent('menu:changed');
    return formatMenuItem(item);
  },

  updateMenuItem: async ({ id, ...rest }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(menuItemSchema.partial(), rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const existing = await db.menuItems.findOne({ _id: id }).exec();
    if (!existing) throw new Error('Menu item not found');
    await existing.update({ $set: v.data });
    const item = existing; // RxDB doc
    emitEvent('menu:changed');
    return formatMenuItem(item);
  },

  deleteMenuItem: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const item = await db.menuItems.findOne({ _id: id }).exec();
    if (!item) throw new Error('Menu item not found');
    await item.remove();
    emitEvent('menu:changed');
    return 'Menu item removed';

  },
};
