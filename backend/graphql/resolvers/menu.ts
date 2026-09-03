import MenuItem from '../../models/MenuItem.js';
import { menuItemSchema, validate } from '../validation.js';
import { requireAdmin } from '../helpers/auth.js';
import { formatMenuItem } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

export const menuResolvers = {
  menuItems: async ({ category, available }: any) => {
    const filter: any = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available;
    const docs = await MenuItem.find(filter).sort('category').lean();
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
    const item = await MenuItem.create(v.data);
    emitEvent('menu:changed');
    return formatMenuItem(item);
  },

  updateMenuItem: async ({ id, ...rest }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(menuItemSchema.partial(), rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const item = await MenuItem.findByIdAndUpdate(id, v.data, {
      new: true,
      runValidators: true,
    }).lean();
    emitEvent('menu:changed');
    return formatMenuItem(item);
  },

  deleteMenuItem: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) throw new Error('Menu item not found');
    emitEvent('menu:changed');
    return 'Menu item removed';
  },
};
