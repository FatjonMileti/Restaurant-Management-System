import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { categorySchema, validate } from '../validation.js';
import { formatCategory } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';
import { requireAdmin } from '../helpers/auth.js';

const genId = () => crypto.randomUUID();

export const categoryResolvers = {
  categories: async (_args: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const docs = await db.categories.find().sort('name').exec();
    return docs.map(formatCategory);
  },
  category: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) return null;
    return formatCategory(doc.toJSON());
  },
  createCategory: async ({ name }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const catDoc = await db.categories.insert({ _id: genId(), ...v.data });
    emitEvent('categories:changed');
    return formatCategory(catDoc.toJSON());
  },
  updateCategory: async ({ id, name }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) throw new Error('Category not found');
    await doc.update({ $set: v.data });
    emitEvent('categories:changed');
    const updated = await db.categories.findOne(id).exec();
    return formatCategory(updated?.toJSON() || doc.toJSON());
  },
  deleteCategory: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) throw new Error('Category not found');
    await doc.remove();
    await db.categories.cleanup(0);
    emitEvent('categories:changed');
    return 'Category removed';
  },
};
