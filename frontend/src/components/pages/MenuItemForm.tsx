import React from 'react';
import { useForm } from 'react-hook-form';
import { useCreateMenuItem, Category } from '../../api/queries';

interface MenuItemFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

interface Props {
  categories: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MenuItemForm({ categories, onSuccess, onCancel }: Props) {
  const createItem = useCreateMenuItem();
  const { register, handleSubmit, reset } = useForm<MenuItemFormData>({
    defaultValues: { name: '', description: '', price: 0, category: categories.length > 0 ? categories[0] : '', image: '' },
  });

  const onSubmit = async (data: MenuItemFormData) => {
    try {
      await createItem.mutateAsync({ ...data, price: Number(data.price) });
      reset();
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create item');
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
        <button type="submit" disabled={createItem.isPending} className="btn-primary">Create</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
