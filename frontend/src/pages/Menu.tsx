import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useMenu, MenuItem, useCategories, Category } from '../api/queries';
import { useAuth } from '../store/authStore';
import MenuItemForm from '../components/pages/MenuItemForm';
import MenuItemCard from '../components/pages/MenuItemCard';


function Menu() {
  const { data: items = [], error, isLoading } = useMenu();
  const { data: categoriesData = [] } = useCategories();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = categoriesData.map((c: Category) => c.name);
  const isAdmin = user?.role === 'admin';

  const handleEdit = (item: MenuItem) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setShowForm(true);
  };

  const filteredItems = items.filter((item: MenuItem) =>
    categoryFilter ? item.category === categoryFilter : true
  );

  return (
    <Box>
      <Box className="flex justify-between items-center mb-2">
        <Typography variant="h4" className="page-heading">Menu</Typography>
        {isAdmin && (
          <Button variant="contained" color="secondary" onClick={() => { setShowForm(!showForm); setEditingItem(null); }}>
            {showForm ? 'Cancel' : '+ Add Item'}
          </Button>
        )}
      </Box>
      <Box className="flex gap-2 mb-2 bg-gray-100 p-2 rounded items-center">
        <Typography variant="body2" className="font-semibold">Filter:</Typography>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="form-input-sm w-40">
          <option value="">All</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {categoryFilter && <Button size="small" onClick={() => setCategoryFilter('')}>Clear</Button>}
      </Box>
      {showForm && (
        <MenuItemForm
          categories={categories}
          item={editingItem || undefined}
          onSuccess={() => { setShowForm(false); setEditingItem(null); }}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
      {isLoading && (
        <Box className="loading-wrapper !py-4">
          <Box className="spinner" />
        </Box>
      )}
      {error && !isLoading && <Typography className="text-red-600">{(error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) ? 'Network error: backend is unavailable' : error instanceof Error ? error.message : 'Failed to load menu')}</Typography>}
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
        {filteredItems.map((item: MenuItem) => (
          <MenuItemCard key={item._id} item={item} onEdit={handleEdit} />
        ))}
      </Box>
    </Box>
  );
}

export default Menu;
