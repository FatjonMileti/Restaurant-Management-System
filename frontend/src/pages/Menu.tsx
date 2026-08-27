import React, { useState } from 'react';
import { useMenu, MenuItem, useCategories, Category } from '../api/queries';
import MenuHeader from '../components/pages/MenuHeader';
import MenuItemForm from '../components/pages/MenuItemForm';
import MenuItemCard from '../components/pages/MenuItemCard';

function Menu() {
  const { data: items = [], error } = useMenu();
  const { data: categoriesData = [] } = useCategories();
  const [showForm, setShowForm] = useState(false);

  const categories = categoriesData.map((c: Category) => c.name);

  return (
    <div>
      <MenuHeader showForm={showForm} toggleForm={() => setShowForm(!showForm)} />
      {showForm && (
        <MenuItemForm
          categories={categories}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
      {error && <p className="error-text">{error instanceof Error ? error.message : 'Failed to load menu'}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {items.map((item: MenuItem) => (
          <MenuItemCard key={item._id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default Menu;
