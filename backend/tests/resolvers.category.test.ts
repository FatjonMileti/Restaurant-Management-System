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

const mockFind = Category.find as unknown as jest.Mock;
const mockFindById = Category.findById as unknown as jest.Mock;
const mockCreate = Category.create as unknown as jest.Mock;
const mockUpdate = Category.findByIdAndUpdate as unknown as jest.Mock;

describe('category resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('categories returns formatted list sorted', async () => {
    const docs = [{ _id: new mongoose.Types.ObjectId(), name: 'Drinks' }];
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(docs) }),
    });
    const res = await categoryResolvers.categories();
    expect(res[0].id).toBe(docs[0]._id.toString());
    expect(mockFind).toHaveBeenCalled();
  });

  it('category returns single formatted', async () => {
    const id = new mongoose.Types.ObjectId();
    mockFindById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: id, name: 'Food' }) });
    const res: any = await categoryResolvers.category({ id: id.toString() });
    expect(res.id).toBe(id.toString());
  });

  it('createCategory validates and formats', async () => {
    const id = new mongoose.Types.ObjectId();
    mockCreate.mockResolvedValue({
      _id: id,
      name: 'Dessert',
      toObject: () => ({ _id: id, name: 'Dessert' }),
    } as any);
    // create uses formatCategory which calls toObject, so mock with toObject
    const res: any = await categoryResolvers.createCategory({ name: 'Dessert' });
    expect(res.name).toBe('Dessert');
    expect(res.id).toBe(id.toString());
  });

  it('createCategory rejects empty name', async () => {
    await expect(categoryResolvers.createCategory({ name: '' })).rejects.toThrow();
  });

  it('updateCategory formats result', async () => {
    const id = new mongoose.Types.ObjectId();
    mockUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: id, name: 'Updated' }) });
    const res: any = await categoryResolvers.updateCategory({ id: id.toString(), name: 'Updated' });
    expect(res.id).toBe(id.toString());
  });
});
