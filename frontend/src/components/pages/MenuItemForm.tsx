import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateMenuItem, useUpdateMenuItem, MenuItem } from '../../api/queries';
import { menuItemSchema, MenuItemFormData } from '../../validation/schemas';

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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
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
      <input placeholder="Name" {...register('name')} className="form-input-sm" />
      {errors.name && <p className="error-text text-sm">{errors.name.message}</p>}
      <input placeholder="Description" {...register('description')} className="form-input-sm" />
      <input type="number" step="0.01" placeholder="Price" {...register('price', { valueAsNumber: true })} className="form-input-sm" />
      {errors.price && <p className="error-text text-sm">{errors.price.message}</p>}
      <select {...register('category')} className="form-input-sm">
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {errors.category && <p className="error-text text-sm">{errors.category.message}</p>}
      <input placeholder="Image URL" {...register('image')} className="form-input-sm" />
      {errors.image && <p className="error-text text-sm">{errors.image.message}</p>}
      <div className="flex gap-2 mt-2">
        <button type="submit" disabled={isEdit ? updateItem.isPending : createItem.isPending} className="btn-primary">{isEdit ? 'Update' : 'Create'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
