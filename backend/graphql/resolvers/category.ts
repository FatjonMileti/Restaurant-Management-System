import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { categorySchema, validate } from '../validation.js';
import { formatCategory } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

const genId = () => crypto.randomUUID();

export const categoryResolvers = {
  categories: async () => {
    const db = await getDB();
    const docs = await db.categories.find().sort('name').exec();
    return docs.map(formatCategory);
  },
  category: async ({ id }: any) => {
    const db = await getDB();
    const doc = await db.categories.findOne({ _id: id }).exec();
    if (!doc) return null;
    return formatCategory(doc.toJSON());
  },
  createCategory: async ({ name }: any) => {
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const catDoc = await db.categories.insert({ _id: genId(), ...v.data });
    emitEvent('categories:changed');
    return formatCategory(catDoc.toJSON());
  },
  updateCategory: async ({ id, name }: any) => {
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.categories.findOne({ _id: id }).exec();
    if (!doc) throw new Error('Category not found');
    await doc.update({ $set: v.data });
    emitEvent('categories:changed');
    return formatCategory(doc.toJSON());
  },
  deleteCategory: async ({ id }: any) => {
    const db = await getDB();
    const doc = await db.categories.findOne({ _id: id }).exec();
    if (!doc) throw new Error('Category not found');
    await doc.remove();
    emitEvent('categories:changed');
    return 'Category removed';
  },
};
