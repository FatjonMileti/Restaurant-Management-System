import { getDB } from '../../config/rxdb.js';
import { restaurantSettingsSchema, validate } from '../validation.js';
import { notFoundError, validationError } from '../errors.js';
import { formatRestaurantSettings, getOrCreateRestaurantSettings } from '../helpers/formatters.js';
import { requireAdmin } from '../helpers/auth.js';
import { emitEvent } from '../../sse.js';
import { recordActivity } from '../helpers/activityLog.js';

export const settingsResolvers = {
  restaurantSettings: async (context: any) => {
    const db = await getDB();
    const doc = await db.settings.findOne().exec();
    if (!doc) throw notFoundError('Settings not found');
    return formatRestaurantSettings(doc.toJSON());
  },

  updateRestaurantSettings: async (
    { name, logo, address, phone, email, tableCount }: any,
    context: any,
  ) => {
    await requireAdmin(context);
    const v = validate(restaurantSettingsSchema, { name, logo, address, phone, email, tableCount });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.settings.findOne().exec();
    if (!doc) throw notFoundError('Settings not found');
    const updates: any = {};
    if (v.data.name !== undefined) updates.name = v.data.name;
    if (v.data.logo !== undefined) updates.logo = v.data.logo;
    if (v.data.address !== undefined) updates.address = v.data.address;
    if (v.data.phone !== undefined) updates.phone = v.data.phone;
    if (v.data.email !== undefined) updates.email = v.data.email;
    if (v.data.tableCount !== undefined) {
      if (v.data.tableCount < 1) throw validationError('tableCount must be at least 1');
      updates.tableCount = v.data.tableCount;
    }
    // Bump updatedAt so clients caching the logo (or other settings) by
    // version know the entity changed and refetch.
    updates.updatedAt = new Date().toISOString();
    await doc.update({ $set: updates });
    const updated = await db.settings.findOne().exec();
    const settings = formatRestaurantSettings(updated?.toJSON() || doc.toJSON());
    emitEvent('settings:changed', { settings }, context?.userId);
    emitEvent('tables:changed', {}, context?.userId);
    await recordActivity(context, {
      action: 'update',
      entity: 'settings',
      entityId: settings?.id,
      summary: 'Restaurant settings updated',
    });
    return settings;
  },
};
