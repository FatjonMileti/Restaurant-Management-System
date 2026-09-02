import Category from '../../models/Category.js';
import { categorySchema, validate } from '../validation.js';
import { formatCategory } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

export const categoryResolvers = {
  categories: async () => {
    const docs = await Category.find().sort('name').lean();
    return docs.map(formatCategory);
  },
  category: async ({ id }: any) => {
    const doc = await Category.findById(id).lean();
    return formatCategory(doc);
  },

  createCategory: async ({ name }: any) => {
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const cat = await Category.create(v.data);
    emitEvent('categories:changed');
    return formatCategory(cat);
  },
  updateCategory: async ({ id, name }: any) => {
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const cat = await Category.findByIdAndUpdate(id, v.data, { new: true, runValidators: true }).lean();
    emitEvent('categories:changed');
    return formatCategory(cat);
  },
  deleteCategory: async ({ id }: any) => {
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) throw new Error('Category not found');
    emitEvent('categories:changed');
    return 'Category removed';
  },
};
