jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import { getDB } from '../config/rxdb';
import { categoryResolvers } from '../graphql/resolvers/category';

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getDB as unknown as jest.Mock).mockResolvedValue({
    categories: {
      find: mockFind,
      findOne: mockFindOne,
      insert: mockInsert,
    },
  });
  mockFind.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) });
});

describe('category resolvers', () => {
  it('categories returns empty list', async () => {
    const res = await categoryResolvers.categories();
    expect(res).toEqual([]);
    expect(mockFind).toHaveBeenCalled();
  });

  it('category returns null if not found', async () => {
    mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const single = await categoryResolvers.category({ id: '123' });
    expect(single).toBeNull();
    expect(mockFindOne).toHaveBeenCalled();
  });

  it('createCategory inserts and returns formatted doc', async () => {
    const createdDoc = { toJSON: () => ({ _id: 'c1', name: 'Dessert' }) };
    mockInsert.mockResolvedValue(createdDoc);
    const created = await categoryResolvers.createCategory({ name: 'Dessert' });
    expect(created.name).toBe('Dessert');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('updateCategory updates and returns formatted doc', async () => {
    const foundDoc = {
      toJSON: () => ({ _id: 'c1', name: 'Updated' }),
      update: mockUpdate.mockResolvedValue(undefined),
    };
    mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(foundDoc) });
    const updated = await categoryResolvers.updateCategory({ id: 'c1', name: 'Updated' });
    expect(updated.id).toBe('c1');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('deleteCategory removes and returns success', async () => {
    const delDoc = { remove: mockRemove.mockResolvedValue(undefined) };
    mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(delDoc) });
    const delRes = await categoryResolvers.deleteCategory({ id: 'c1' });
    expect(delRes).toBe('Category removed');
    expect(mockRemove).toHaveBeenCalled();
  });
});
