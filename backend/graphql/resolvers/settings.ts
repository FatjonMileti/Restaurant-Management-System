import { getDB } from '../../config/rxdb.js';
import { restaurantSettingsSchema, validate } from '../validation.js';
import { formatRestaurantSettings, getOrCreateRestaurantSettings } from '../helpers/formatters.js';
import { requireAdmin } from '../helpers/auth.js';
import { emitEvent } from '../../socket.js';

export const settingsResolvers = {
  restaurantSettings: async () => {
    const db = await getDB();
    const doc = await db.settings.findOne().exec();
    if (!doc) throw new Error('Settings not found');
    return formatRestaurantSettings(doc.toJSON());
  },

  updateRestaurantSettings: async ({ name, logo, address, phone, email, tableCount }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(restaurantSettingsSchema, { name, logo, address, phone, email, tableCount });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.settings.findOne().exec();
    if (!doc) throw new Error('Settings not found');
    const updates: any = {};
    if (v.data.name !== undefined) updates.name = v.data.name;
    if (v.data.logo !== undefined) updates.logo = v.data.logo;
    if (v.data.address !== undefined) updates.address = v.data.address;
    if (v.data.phone !== undefined) updates.phone = v.data.phone;
    if (v.data.email !== undefined) updates.email = v.data.email;
    if (v.data.tableCount !== undefined) {
      if (v.data.tableCount < 1) throw new Error('tableCount must be at least 1');
      updates.tableCount = v.data.tableCount;
    }
    await doc.update({ $set: updates });
    emitEvent('settings:changed');
    emitEvent('tables:changed');
    return formatRestaurantSettings(doc.toJSON());
  },
};
