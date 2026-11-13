jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));
jest.mock('../graphql/helpers/formatters.js', () => ({
  getOrCreateRestaurantSettings: jest.fn(),
}));
jest.mock('../services/availabilityService.js', () => ({
  checkReservationAvailability: jest.fn(),
}));

import { getDB } from '../config/rxdb.js';
import { getOrCreateRestaurantSettings } from '../graphql/helpers/formatters.js';
import { checkReservationAvailability } from '../services/availabilityService.js';
import { createAvailabilityTool } from '../ai/tools/availabilityTool.js';
import { createKnowledgeTool } from '../ai/tools/knowledgeTool.js';
import { getMenuItemDetailsTool, searchMenuTool } from '../ai/tools/menuTools.js';
import { createRestaurantInformationTool } from '../ai/tools/restaurantTools.js';

const asMock = (value: unknown) => value as jest.Mock;

const menuRows = [
  {
    _id: 'm1',
    name: 'Tomato Pasta',
    description: 'House pasta with tomato',
    price: 12.5,
    category: 'main',
    image: 'pasta.jpg',
    available: true,
  },
  {
    _id: 'm2',
    name: 'Chocolate Cake',
    description: 'Dessert',
    price: 6,
    category: 'dessert',
    available: true,
  },
  {
    _id: 'm3',
    name: 'Hidden Pasta',
    description: 'Not available today',
    price: 9,
    category: 'main',
    available: false,
  },
];

const installMenuDb = () => {
  asMock(getDB).mockResolvedValue({
    menuItems: {
      find: jest.fn(() => ({
        exec: async () => menuRows.map((row) => ({ toJSON: () => row })),
      })),
      findOne: jest.fn((id: string) => ({
        exec: async () => {
          const found = menuRows.find((row) => row._id === id);
          return found ? { toJSON: () => found } : null;
        },
      })),
    },
  });
};

describe('read-only restaurant tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installMenuDb();
  });

  it('searches the live menu with validated filters and stable prices', async () => {
    const result: any = await searchMenuTool.handler(
      { query: 'pasta', availableOnly: true, limit: 10 },
      {},
    );
    expect(result.ok).toBe(true);
    expect(result.data.total).toBe(2);
    expect(result.data.dietaryMetadataAvailable).toBe(false);
    expect(result.data.items.map((item: any) => item.menuItemId)).toEqual(['m1', 'm3']);
    expect(result.data.items[0]).toMatchObject({
      name: 'Tomato Pasta',
      price: 12.5,
      category: 'main',
    });

    const cheap: any = await searchMenuTool.handler(
      { maxPrice: 10, availableOnly: true, limit: 10 },
      {},
    );
    expect(cheap.data.items.map((item: any) => item.menuItemId)).toEqual(['m2', 'm3']);
  });

  it('returns stored details only and reports missing items', async () => {
    const found: any = await getMenuItemDetailsTool.handler({ itemId: 'm1' }, {});
    expect(found.ok).toBe(true);
    expect(found.data.item.name).toBe('Tomato Pasta');
    expect(found.data.dietaryMetadataAvailable).toBe(false);
    expect(found.data.verifiedFields).toContain('price');

    await expect(getMenuItemDetailsTool.handler({ itemId: 'missing' }, {})).resolves.toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  it('returns public restaurant information with explicit missing metadata', async () => {
    asMock(getOrCreateRestaurantSettings).mockResolvedValue({
      name: 'Trattoria',
      address: '1 Main St',
      phone: '555',
      email: 'hello@example.com',
      logo: 'logo.png',
      tableCount: 8,
      secretKey: 'do-not-expose',
    });
    const result: any = await createRestaurantInformationTool('Europe/Rome').handler({}, {});
    expect(result.data).toMatchObject({
      name: 'Trattoria',
      address: '1 Main St',
      tableCount: 8,
      currency: 'USD',
      timeZone: 'Europe/Rome',
    });
    expect(result.data.note).toMatch(/opening hours/i);
    expect(JSON.stringify(result)).not.toContain('do-not-expose');
  });

  it('passes availability checks through the shared service', async () => {
    asMock(checkReservationAvailability).mockResolvedValue({
      available: true,
      date: '2030-01-01',
      time: '19:00',
      guests: 2,
      timeZone: 'UTC',
      freeTables: [1, 2],
      tableCount: 4,
      capacityVerified: false,
      openingHoursVerified: false,
      notes: ['No capacity data'],
    });
    const tool = createAvailabilityTool({ timeZone: 'UTC', maxPartySize: 10 });
    const result: any = await tool.handler({ date: '2030-01-01', time: '19:00', guests: 2 }, {});
    expect(result.ok).toBe(true);
    expect(result.data.freeTables).toEqual([1, 2]);
    expect(checkReservationAvailability).toHaveBeenCalledWith(
      { date: '2030-01-01', time: '19:00', guests: 2 },
      { timeZone: 'UTC', maxPartySize: 10 },
    );
  });

  it('reports knowledge unavailability instead of guessing', async () => {
    const unavailable: any = await createKnowledgeTool(null).handler({ query: 'hours' }, {});
    expect(unavailable).toMatchObject({ ok: false, error: { code: 'RAG_UNAVAILABLE' } });

    const knowledge = {
      search: jest.fn().mockResolvedValue([]),
    } as any;
    const empty: any = await createKnowledgeTool(knowledge).handler({ query: 'hours' }, {});
    expect(empty.ok).toBe(true);
    expect(empty.data.results).toEqual([]);
    expect(empty.data.message).toMatch(/not available/i);

    knowledge.search.mockResolvedValue([
      {
        chunkId: 'c1',
        documentId: 'd1',
        title: 'Opening notes',
        sourceType: 'policy',
        chunkIndex: 0,
        excerpt: 'No opening hours are stored.',
        score: 0.8,
      },
    ]);
    const cited: any = await createKnowledgeTool(knowledge).handler({ query: 'hours' }, {});
    expect(cited.data.results[0]).toMatchObject({ title: 'Opening notes', score: 0.8 });
  });
});
