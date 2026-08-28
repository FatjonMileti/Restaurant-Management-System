import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useMenu, MenuItem, useCategories, Category } from '../api/queries';
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Menu</Typography>
        <Button variant="contained" color="secondary" onClick={() => { setShowForm(!showForm); setEditingItem(null); }}>
          {showForm ? 'Cancel' : '+ Add Item'}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Filter:</Typography>
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Box sx={{ animation: 'spin 1s linear infinite', height: 40, width: 40, border: '4px solid #e94560', borderTop: '4px solid transparent', borderRadius: '50%' }} />
        </Box>
      )}
      {error && !isLoading && <Typography color="error">{error instanceof Error ? error.message : 'Failed to load menu'}</Typography>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
        {filteredItems.map((item: MenuItem) => (
          <MenuItemCard key={item._id} item={item} onEdit={handleEdit} />
        ))}
      </Box>
    </Box>
  );
}

export default Menu;
