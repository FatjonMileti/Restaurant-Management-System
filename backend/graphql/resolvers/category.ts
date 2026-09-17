import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { categorySchema, validate } from '../validation.js';
import { notFoundError, validationError } from '../errors.js';
import { formatCategory } from '../helpers/formatters.js';
import { emitEvent } from '../../sse.js';
import { requireAdmin } from '../helpers/auth.js';

const genId = () => crypto.randomUUID();

export const categoryResolvers = {
  categories: async (_args: any, context?: any) => {
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
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const catDoc = await db.categories.insert({ _id: genId(), ...v.data });
    const category = formatCategory(catDoc.toJSON());
    emitEvent('categories:changed', { category }, context?.userId);
    return category;
  },
  updateCategory: async ({ id, name }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(categorySchema, { name });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) throw notFoundError('Category not found');
    await doc.update({ $set: v.data });
    const updated = await db.categories.findOne(id).exec();
    const category = formatCategory(updated?.toJSON() || doc.toJSON());
    emitEvent('categories:changed', { category }, context?.userId);
    return category;
  },
  deleteCategory: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) throw notFoundError('Category not found');
    await doc.remove();
    await db.categories.cleanup(0);
    emitEvent('categories:changed', { category: { id, deleted: true } }, context?.userId);
    return 'Category removed';
  },
};
