import { buildSchema } from 'graphql';
import { typeDefs } from '../graphql/typeDefs';

describe('typeDefs', () => {
  it('builds valid GraphQL schema', () => {
    const schema = buildSchema(typeDefs);
    expect(schema).toBeDefined();
    const query = schema.getQueryType();
    expect(query).toBeDefined();
    const fields = query!.getFields();
    expect(fields.dashboardStats).toBeDefined();
    expect(fields.menuItems).toBeDefined();
    expect(fields.tables).toBeDefined();
  });

  it('contains DashboardStats type', () => {
    const schema = buildSchema(typeDefs);
    const type = schema.getType('DashboardStats');
    expect(type).toBeDefined();
  });

  it('contains TableStatus and StatusCount', () => {
    const schema = buildSchema(typeDefs);
    expect(schema.getType('TableStatus')).toBeDefined();
    expect(schema.getType('StatusCount')).toBeDefined();
  });
});
