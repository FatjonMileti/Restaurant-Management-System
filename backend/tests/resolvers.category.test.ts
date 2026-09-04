import mongoose from 'mongoose';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn().mockResolvedValue({
    categories: {
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }),
      findOne: jest.fn(),
      insert: jest.fn(),
    },
  }),
  getRxDB: jest.fn(),
}));

jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import { categoryResolvers } from '../graphql/resolvers/category';

    const mockFind = jest.fn();
    const mockFindOne = jest.fn();
    const mockInsert = jest.fn();
    const mockUpdate = jest.fn();
    const mockRemove = jest.fn();
    // Set up getDB mock to return our mocked collection
    (getDB as unknown as jest.Mock).mockResolvedValue({
      categories: {
        find: mockFind,
        findOne: mockFindOne,
        insert: mockInsert,
      },
    });

    // Mock implementations for resolvers
    mockFind.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) });
    // categories resolver
    const categoriesRes = await categoryResolvers.categories();
    expect(categoriesRes).toEqual([]);
    expect(mockFind).toHaveBeenCalled();

    // category resolver - not found
    mockFindOne.mockResolvedValue(null);
    const single = await categoryResolvers.category({ id: '123' });
    expect(single).toBeNull();
    expect(mockFindOne).toHaveBeenCalled();

    // createCategory
    const createdDoc = { toJSON: () => ({ id: 'c1', name: 'Dessert' }) } as any;
    mockInsert.mockResolvedValue(createdDoc);
    const created = await categoryResolvers.createCategory({ name: 'Dessert' });
    expect(created.name).toBe('Dessert');
    expect(mockInsert).toHaveBeenCalled();

    // updateCategory
    const foundDoc = { toJSON: () => ({ id: 'c1', name: 'Updated' }), update: mockUpdate } as any;
    mockFindOne.mockResolvedValue(foundDoc);
    const updated = await categoryResolvers.updateCategory({ id: 'c1', name: 'Updated' });
    expect(updated.id).toBe('c1');
    expect(mockUpdate).toHaveBeenCalled();

    // deleteCategory
    const delDoc = { remove: mockRemove } as any;
    mockFindOne.mockResolvedValue(delDoc);
    const delRes = await categoryResolvers.deleteCategory({ id: 'c1' });
    expect(delRes).toBe('Category removed');
    expect(mockRemove).toHaveBeenCalled();

