import React from 'react';
import { useAuth } from '../../store/authStore';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from '../../api/queries';

export default function CategorySection() {
  const { data: categoriesData = [] } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [editCategoryId, setEditCategoryId] = React.useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = React.useState('');

  const handleCreateCategory = async () => {
    try {
      if (!newCategoryName.trim()) return;
      await createCategory.mutateAsync({ name: newCategoryName.trim() });
      setNewCategoryName('');
    } catch (err) { alert((err as Error)?.message || 'Failed to create category'); }
  };

  const handleEditCategory = async () => {
    try {
      if (!editCategoryId || !editCategoryName.trim()) return;
      await updateCategory.mutateAsync({ id: editCategoryId, name: editCategoryName.trim() });
      setEditCategoryId(null); setEditCategoryName('');
    } catch (err) { alert((err as Error)?.message || 'Failed to update category'); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category?')) return;
    try { await deleteCategory.mutateAsync(id); } catch (err) { alert((err as Error)?.message || 'Failed to delete category'); }
  };

  return (
    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
      <h3 className="text-xl font-semibold mb-4">Categories</h3>
      <div className="flex gap-2 mb-5">
        <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="form-input-sm !mb-0 flex-1" />
        <button onClick={handleCreateCategory} className="px-4 py-2.5 bg-[#3498db] text-white border-none rounded-md cursor-pointer hover:bg-[#2980b9] transition-colors whitespace-nowrap">Add Category</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categoriesData.map((cat: Category) => (
          <div key={cat._id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-blue-200 shadow-sm">
            {editCategoryId === cat._id ? (
              <>
                <input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} className="w-32 p-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
                <button onClick={handleEditCategory} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                <button onClick={() => { setEditCategoryId(null); setEditCategoryName(''); }} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium">{cat.name}</span>
                <button onClick={() => { setEditCategoryId(cat._id); setEditCategoryName(cat.name); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                <button onClick={() => handleDeleteCategory(cat._id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
