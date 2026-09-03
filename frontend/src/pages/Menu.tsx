import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useMenu, MenuItem, useCategories, Category } from '../api/queries';
import { useAuth } from '../store/authStore';
import MenuItemForm from '../components/pages/MenuItemForm';
import MenuItemCard from '../components/pages/MenuItemCard';
import MenuCategoryFilter from '../components/pages/MenuCategoryFilter';
import PageHeader from '../components/PageHeader';

function Menu() {
  const { data: items = [], error, isLoading } = useMenu();
  const { data: categoriesData = [] } = useCategories();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = useMemo(() => categoriesData.map((c: Category) => c.name), [categoriesData]);
  const isAdmin = user?.role === 'admin';

  const handleEdit = useCallback(
    (item: MenuItem) => {
      if (!isAdmin) return;
      setEditingItem(item);
      setShowForm(true);
    },
    [isAdmin],
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item: MenuItem) => (categoryFilter ? item.category === categoryFilter : true)),
    [items, categoryFilter],
  );

  return (
    <Box>
      <PageHeader
        title="Menu"
        action={
          isAdmin ? (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                setShowForm(!showForm);
                setEditingItem(null);
              }}
            >
              {showForm ? 'Cancel' : '+ Add Item'}
            </Button>
          ) : undefined
        }
      />
      <MenuCategoryFilter
        categories={categories}
        value={categoryFilter}
        onChange={setCategoryFilter}
      />
      {showForm && (
        <MenuItemForm
          categories={categories}
          item={editingItem || undefined}
          onSuccess={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
      {error && !isLoading && (
        <Typography className="text-red-600">
          {error instanceof TypeError &&
          (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
            ? 'Network error: backend is unavailable'
            : error instanceof Error
              ? error.message
              : 'Failed to load menu'}
        </Typography>
      )}
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
        {filteredItems.map((item: MenuItem) => (
          <MenuItemCard key={item._id} item={item} onEdit={handleEdit} />
        ))}
      </Box>
    </Box>
  );
}

export default Menu;
