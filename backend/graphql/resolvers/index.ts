import { authResolvers } from './auth.js';
import { menuResolvers } from './menu.js';
import { orderResolvers } from './order.js';
import { reservationResolvers } from './reservation.js';
import { categoryResolvers } from './category.js';
import { settingsResolvers } from './settings.js';
import { tablesResolvers } from './tables.js';
import { dashboardResolvers } from './dashboard.js';

export const resolvers = {
  hello: () => 'Hello from GraphQL',
  ...authResolvers,
  ...menuResolvers,
  ...orderResolvers,
  ...reservationResolvers,
  ...categoryResolvers,
  ...settingsResolvers,
  ...tablesResolvers,
  ...dashboardResolvers,
};
