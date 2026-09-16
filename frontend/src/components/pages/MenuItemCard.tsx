import React from 'react';
import { MenuItem } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import { useCachedImage } from '../../hooks/useCachedImage';

interface Props {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

const MenuItemCard = React.memo(function MenuItemCard({ item, onEdit, onDelete }: Props) {
  const { user } = useAuth();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item._id);
  };

  const isAdmin = user?.role === 'admin';
  const imgSrc = useCachedImage(item.image, '/images/empty.jpg', item.updatedAt);
  return (
    <div
      className={`card-grid ${isAdmin ? 'cursor-pointer' : ''} ${!item.available ? 'opacity-60 grayscale' : ''}`}
      onClick={() => isAdmin && onEdit(item)}
    >
      <div className="w-full h-32 rounded-md overflow-hidden mb-3 bg-gray-100 relative">
        <img
          src={imgSrc || '/images/empty.jpg'}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => ((e.target as HTMLImageElement).src = '/images/empty.jpg')}
        />
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-white text-black text-xs font-bold px-2 py-1 rounded uppercase">
              Unavailable
            </span>
          </div>
        )}
      </div>
      <h3 className={`text-lg font-semibold ${!item.available ? 'text-gray-500' : ''}`}>{item.name}</h3>
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
