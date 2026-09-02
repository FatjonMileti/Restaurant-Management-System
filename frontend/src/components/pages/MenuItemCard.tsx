import React from 'react';
import { MenuItem } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import { useDeleteMenuItem } from '../../api/queries';

interface Props {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
}

const MenuItemCard = React.memo(function MenuItemCard({ item, onEdit }: Props) {
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

  const isAdmin = user?.role === 'admin';
  return (
    <div
      className={`card-grid ${isAdmin ? 'cursor-pointer' : ''}`}
      onClick={() => isAdmin && onEdit(item)}
    >
      <div className="w-full h-32 rounded-md overflow-hidden mb-3 bg-gray-100">
        <img
          src={item.image || '/images/empty.jpg'}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => ((e.target as HTMLImageElement).src = '/images/empty.jpg')}
        />
      </div>
      <h3 className="text-lg font-semibold">{item.name}</h3>
      <p className="text-gray-500">{item.description}</p>
      <p className="mt-2">
        <strong>${item.price.toFixed(2)}</strong>{' '}
        <span className="text-gray-400">({item.category})</span>
      </p>
      {isAdmin && (
        <button onClick={handleDelete} className="btn-danger-sm mt-3">
          Delete
        </button>
      )}
    </div>
  );
});

export default MenuItemCard;
