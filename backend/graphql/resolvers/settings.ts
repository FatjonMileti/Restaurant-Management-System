import { restaurantSettingsSchema, validate } from '../validation.js';
import { formatRestaurantSettings, getOrCreateRestaurantSettings } from '../helpers/formatters.js';
import { requireAdmin } from '../helpers/auth.js';
import { emitEvent } from '../../socket.js';

export const settingsResolvers = {
  restaurantSettings: async () => {
    const settings = await getOrCreateRestaurantSettings();
    return formatRestaurantSettings(settings);
  },

  updateRestaurantSettings: async (
    { name, logo, address, phone, email, tableCount }: any,
    context?: any,
  ) => {
    await requireAdmin(context);
    const v = validate(restaurantSettingsSchema, { name, logo, address, phone, email, tableCount });
    if (!v.success) throw new Error(v.errors.join(', '));
    let settings = await getOrCreateRestaurantSettings();
    if (v.data.name !== undefined) settings.name = v.data.name;
    if (v.data.logo !== undefined) settings.logo = v.data.logo;
    if (v.data.address !== undefined) settings.address = v.data.address;
    if (v.data.phone !== undefined) settings.phone = v.data.phone;
    if (v.data.email !== undefined) settings.email = v.data.email;
    if (v.data.tableCount !== undefined) {
      if (v.data.tableCount < 1) throw new Error('tableCount must be at least 1');
      settings.tableCount = v.data.tableCount;
    }
    await settings.save();
    emitEvent('settings:changed');
    emitEvent('tables:changed');
    return formatRestaurantSettings(settings);
  },
};
