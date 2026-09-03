import { buildSchema } from 'graphql';
import { typeDefs } from './typeDefs.js';
import { resolvers } from './resolvers/index.js';
// Re-export helpers for backward compatibility if external code imports them
export {
  formatUser,
  formatRestaurantSettings,
  getOrCreateRestaurantSettings,
} from './helpers/formatters.js';
export { requireAuth, requireAdmin } from './helpers/auth.js';

const schema = buildSchema(typeDefs);
const root = resolvers;

export { schema, root };
