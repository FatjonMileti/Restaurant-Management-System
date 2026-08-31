import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateMenuItem, useUpdateMenuItem, MenuItem } from '../../api/queries';

interface MenuItemFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

interface Props {
  categories: string[];
  item?: MenuItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MenuItemForm({ categories, item, onSuccess, onCancel }: Props) {
  const isEdit = !!item;
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const { register, handleSubmit, reset } = useForm<MenuItemFormData>({
    defaultValues: item ? {
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image: item.image || '',
    } : { name: '', description: '', price: 0, category: categories.length > 0 ? categories[0] : '', image: '' },
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: item.category,
        image: item.image || '',
      });
    }
  }, [item, reset]);

  const onSubmit = async (data: MenuItemFormData) => {
    try {
      if (isEdit && item) {
        await updateItem.mutateAsync({ id: item._id, data: { ...data, price: Number(data.price) } });
      } else {
        await createItem.mutateAsync({ ...data, price: Number(data.price) });
      }
      reset();
      onSuccess();
    } catch (err) {
      const msg = (err instanceof TypeError && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) ? 'Network error: backend is unavailable' : err instanceof Error ? err.message : (isEdit ? 'Failed to update item' : 'Failed to create item'));
      alert(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-panel">
      <input placeholder="Name" {...register('name', { required: true })} className="form-input-sm" />
      <input placeholder="Description" {...register('description')} className="form-input-sm" />
      <input type="number" step="0.01" placeholder="Price" {...register('price', { required: true, valueAsNumber: true })} className="form-input-sm" />
      <select {...register('category')} className="form-input-sm">
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input placeholder="Image URL" {...register('image')} className="form-input-sm" />
      <div className="flex gap-2 mt-2">
        <button type="submit" disabled={isEdit ? updateItem.isPending : createItem.isPending} className="btn-primary">{isEdit ? 'Update' : 'Create'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
