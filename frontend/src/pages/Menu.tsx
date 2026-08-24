import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../store/authStore';
import { useCreateMenuItem, useDeleteMenuItem, useMenu, MenuItem } from '../api/queries';

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
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset } = useForm<MenuItemForm>({
    defaultValues: { name: '', description: '', price: 0, category: 'main', image: '' },
  });

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

  const categories = ['appetizer', 'main', 'dessert', 'beverage'];
  const inputClass = "w-full p-2.5 mb-2.5 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560] box-border";

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Menu</h2>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-[#16a085] text-white border-none rounded-md cursor-pointer hover:bg-[#138d75] transition-colors">
            {showForm ? 'Cancel' : '+ Add Item'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-100 p-5 rounded-lg mb-5 mt-4">
          <input placeholder="Name" {...register('name', { required: true })} className={inputClass} />
          <input placeholder="Description" {...register('description')} className={inputClass} />
          <input type="number" step="0.01" placeholder="Price" {...register('price', { required: true, valueAsNumber: true })} className={inputClass} />
          <select {...register('category')} className={inputClass}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {formError && <p className="text-red-600">{formError}</p>}
          <button type="submit" disabled={createItem.isPending} className="px-6 py-2.5 bg-[#e94560] text-white border-none rounded-md cursor-pointer hover:bg-[#d63d54] transition-colors disabled:opacity-50">Create</button>
        </form>
      )}

      {error && <p className="text-red-600">{error instanceof Error ? error.message : 'Failed to load menu'}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {items.map((item: MenuItem) => (
          <div key={item._id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="text-gray-500">{item.description}</p>
            <p className="mt-2"><strong>${item.price.toFixed(2)}</strong> <span className="text-gray-400">({item.category})</span></p>
            {user?.role === 'admin' && (
              <button onClick={() => handleDelete(item._id)} className="mt-3 bg-red-500 text-white border-none px-3 py-1.5 rounded cursor-pointer hover:bg-red-600 transition-colors">Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Menu;
