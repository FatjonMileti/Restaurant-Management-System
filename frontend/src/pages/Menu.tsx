import React, { useState } from 'react';
import { useMenu, MenuItem, useCategories, Category } from '../api/queries';
import LoadingSpinner from '../components/LoadingSpinner';
import FilterBar from '../components/FilterBar';
import MenuHeader from '../components/pages/MenuHeader';
import MenuItemForm from '../components/pages/MenuItemForm';
import MenuItemCard from '../components/pages/MenuItemCard';

function Menu() {
  const { data: items = [], error, isLoading } = useMenu();
  const { data: categoriesData = [] } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = categoriesData.map((c: Category) => c.name);

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const filteredItems = items.filter((item: MenuItem) =>
    categoryFilter ? item.category === categoryFilter : true
  );

  return (
    <div>
      <MenuHeader showForm={showForm} toggleForm={() => { setShowForm(!showForm); setEditingItem(null); }} />
      <FilterBar
        label="Filter by category:"
        theme="gray"
        options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
        value={categoryFilter}
        onChange={setCategoryFilter}
      />
      {showForm && (
        <MenuItemForm
          categories={categories}
          item={editingItem || undefined}
          onSuccess={() => { setShowForm(false); setEditingItem(null); }}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
      {isLoading && <LoadingSpinner />}
      {error && !isLoading && <p className="error-text">{error instanceof Error ? error.message : 'Failed to load menu'}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {filteredItems.map((item: MenuItem) => (
          <MenuItemCard key={item._id} item={item} onEdit={handleEdit} />
        ))}
      </div>
    </div>
  );
}

export default Menu;
