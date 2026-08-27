import React from 'react';
import { MenuItem } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import { useDeleteMenuItem } from '../../api/queries';

interface Props {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onEdit }: Props) {
  const { user } = useAuth();
  const deleteItem = useDeleteMenuItem();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteItem.mutateAsync(item._id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  return (
    <div className="card-grid cursor-pointer" onClick={() => user?.role === 'admin' && onEdit(item)}>
      <h3 className="text-lg font-semibold">{item.name}</h3>
      <p className="text-gray-500">{item.description}</p>
      <p className="mt-2"><strong>${item.price.toFixed(2)}</strong> <span className="text-gray-400">({item.category})</span></p>
      {user?.role === 'admin' && (
        <button onClick={handleDelete} className="btn-danger-sm mt-3">Delete</button>
      )}
    </div>
  );
}
