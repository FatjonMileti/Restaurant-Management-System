import { z } from 'zod';
import { getOrCreateRestaurantSettings } from '../../graphql/helpers/formatters.js';
import type { RegisteredTool } from '../toolRegistry.js';
import type { RestaurantInformationData } from '../types.js';

const emptyArgs = z.object({}).strict();

export const createRestaurantInformationTool = (
  timeZone: string,
): RegisteredTool<z.infer<typeof emptyArgs>> => ({
  name: 'get_restaurant_information',
  description:
    'Get public restaurant details (name, address, phone, email, logo, table count). Does not expose users, logs, or management data.',
  access: 'public',
  schema: emptyArgs,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {},
    required: [],
  },
  async handler() {
    const settings = await getOrCreateRestaurantSettings();
    const data: RestaurantInformationData = {
      name: settings.name ?? '',
      address: settings.address ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      logo: settings.logo ?? '',
      tableCount: Number(settings.tableCount) || 10,
      currency: 'USD',
      timeZone,
      note: 'Only public restaurant settings are returned. Opening hours and per-table capacity are not stored in this system.',
    };
    return { ok: true, data };
  },
});
