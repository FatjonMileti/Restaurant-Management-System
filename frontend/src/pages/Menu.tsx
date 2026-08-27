import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../store/authStore';
import { useCreateMenuItem, useDeleteMenuItem, useMenu, MenuItem, useCategories, Category } from '../api/queries';

interface MenuItemForm {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

function Menu() {
  const { user } = useAuth();
  const { data: items = [], error } = useMenu();
  const { data: categoriesData = [] } = useCategories();
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset } = useForm<MenuItemForm>({
    defaultValues: { name: '', description: '', price: 0, category: categoriesData.length > 0 ? categoriesData[0].name : '', image: '' },
  });

  const categories = categoriesData.map((c: Category) => c.name);

  const onSubmit = async (data: MenuItemForm) => {
    try {
      await createItem.mutateAsync({ ...data, price: Number(data.price) });
      reset();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Menu</h2>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
            {showForm ? 'Cancel' : '+ Add Item'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="form-panel">
          <input placeholder="Name" {...register('name', { required: true })} className="form-input-sm" />
          <input placeholder="Description" {...register('description')} className="form-input-sm" />
          <input type="number" step="0.01" placeholder="Price" {...register('price', { required: true, valueAsNumber: true })} className="form-input-sm" />
          <select {...register('category')} className="form-input-sm">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="Image URL" {...register('image')} className="form-input-sm" />
          {formError && <p className="error-text">{formError}</p>}
          <button type="submit" disabled={createItem.isPending} className="btn-primary">Create</button>
        </form>
      )}

      {error && <p className="error-text">{error instanceof Error ? error.message : 'Failed to load menu'}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {items.map((item: MenuItem) => (
          <div key={item._id} className="card-grid">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="text-gray-500">{item.description}</p>
            <p className="mt-2"><strong>${item.price.toFixed(2)}</strong> <span className="text-gray-400">({item.category})</span></p>
            {user?.role === 'admin' && (
              <button onClick={() => handleDelete(item._id)} className="btn-danger-sm mt-3">Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Menu;
