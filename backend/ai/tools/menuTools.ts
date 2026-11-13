import { z } from 'zod';
import { getDB } from '../../config/rxdb.js';
import type { RegisteredTool } from '../toolRegistry.js';
import type { MenuItemArtifact, MenuItemDetailsData, MenuSearchData } from '../types.js';

const toArtifact = (item: any): MenuItemArtifact => ({
  menuItemId: item._id ?? item.id,
  name: item.name,
  description: item.description ?? '',
  price: item.price,
  category: item.category,
  image: item.image ?? '',
  available: item.available !== false,
});

const searchMenuSchema = z
  .object({
    query: z.string().trim().max(120).optional(),
    category: z.string().trim().max(60).optional(),
    minPrice: z.number().min(0).max(100000).optional(),
    maxPrice: z.number().min(0).max(100000).optional(),
    availableOnly: z.boolean().optional().default(true),
    limit: z.number().int().min(1).max(20).optional().default(10),
  })
  .strict()
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    { message: 'minPrice must be less than or equal to maxPrice' },
  );

const menuItemDetailsSchema = z
  .object({ itemId: z.string().trim().min(1).max(100) })
  .strict();

const tokens = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);

const scoreItem = (item: any, queryTokens: string[]): number => {
  if (queryTokens.length === 0) return 0;
  const name = String(item.name ?? '').toLowerCase();
  const description = String(item.description ?? '').toLowerCase();
  const category = String(item.category ?? '').toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (name === token) score += 6;
    else if (name.includes(token)) score += 4;
    if (category.includes(token)) score += 2;
    if (description.includes(token)) score += 1;
  }
  return score;
};

export const searchMenuTool: RegisteredTool<z.infer<typeof searchMenuSchema>> = {
  name: 'search_menu',
  description:
    'Search the live restaurant menu. Use this for dish recommendations, prices, categories, and availability. Never invent dishes, prices, ingredients, dietary labels, or allergen information.',
  access: 'public',
  schema: searchMenuSchema,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      query: {
        type: 'string',
        description: 'Optional dish/name/description keywords, e.g. "pasta" or "salmon".',
      },
      category: { type: 'string', description: 'Optional exact category, e.g. main or dessert.' },
      minPrice: { type: 'number', minimum: 0, description: 'Optional minimum price.' },
      maxPrice: { type: 'number', minimum: 0, description: 'Optional maximum price.' },
      availableOnly: {
        type: 'boolean',
        description: 'When true (default), omit items marked unavailable.',
      },
      limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Maximum rows (default 10).' },
    },
    required: [],
  },
  async handler(args) {
    const db = await getDB();
    const filter: Record<string, unknown> = {};
    if (args.category) filter.category = args.category;
    if (args.availableOnly) filter.available = true;
    const docs = await db.menuItems.find(filter).exec();
    const queryTokens = tokens(args.query ?? '');

    let items = docs.map((doc: any) => doc.toJSON()).filter((item: any) => {
      if (typeof item.price !== 'number') return false;
      if (args.minPrice !== undefined && item.price < args.minPrice) return false;
      if (args.maxPrice !== undefined && item.price > args.maxPrice) return false;
      if (args.category && String(item.category).toLowerCase() !== args.category.toLowerCase()) {
        return false;
      }
      if (queryTokens.length > 0 && scoreItem(item, queryTokens) === 0) return false;
      return true;
    });

    items = items.sort((a: any, b: any) => {
      const scoreDiff = scoreItem(b, queryTokens) - scoreItem(a, queryTokens);
      if (scoreDiff !== 0) return scoreDiff;
      if (a.category !== b.category) return String(a.category).localeCompare(String(b.category));
      return String(a.name).localeCompare(String(b.name));
    });

    const total = items.length;
    const artifacts = items.slice(0, args.limit).map(toArtifact);
    const data: MenuSearchData = {
      items: artifacts,
      total,
      dietaryMetadataAvailable: false,
      filters: {
        query: args.query ?? null,
        category: args.category ?? null,
        minPrice: args.minPrice ?? null,
        maxPrice: args.maxPrice ?? null,
        availableOnly: args.availableOnly,
      },
    };
    return { ok: true, data };
  },
};

export const getMenuItemDetailsTool: RegisteredTool<z.infer<typeof menuItemDetailsSchema>> = {
  name: 'get_menu_item_details',
  description:
    'Get stored details for one menu item by id. Only fields recorded by the restaurant are returned; dietary and allergen metadata are not available.',
  access: 'public',
  schema: menuItemDetailsSchema,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      itemId: { type: 'string', description: 'Stable menu item id returned by search_menu.' },
    },
    required: ['itemId'],
  },
  async handler(args) {
    const db = await getDB();
    const doc = await db.menuItems.findOne(args.itemId).exec();
    if (!doc) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'That menu item was not found.' },
      };
    }
    const data: MenuItemDetailsData = {
      item: toArtifact(doc.toJSON()),
      dietaryMetadataAvailable: false,
      verifiedFields: ['name', 'description', 'price', 'category', 'image', 'available'],
    };
    return { ok: true, data };
  },
};
