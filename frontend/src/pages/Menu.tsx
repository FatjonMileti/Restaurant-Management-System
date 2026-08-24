import React, { useState } from 'react';
import { useAuth } from '../store/authStore';
import { useCreateMenuItem, useDeleteMenuItem, useMenu, MenuItem } from '../api/queries';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 10, marginBottom: 10, borderRadius: 5, border: '1px solid #ccc', fontSize: '1rem',
  boxSizing: 'border-box',
};

const submitStyle: React.CSSProperties = {
  padding: '10px 25px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#16a085', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer',
};

function Menu() {
  const { user } = useAuth();
  const { data: items = [], error } = useMenu();
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'main', image: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem.mutateAsync({ ...form, price: Number(form.price) });
      setForm({ name: '', description: '', price: '', category: 'main', image: '' });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const categories = ['appetizer', 'main', 'dessert', 'beverage'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Menu</h2>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)} style={addBtnStyle}>
            {showForm ? 'Cancel' : '+ Add Item'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={inputStyle} />
          <input name="description" placeholder="Description" value={form.description} onChange={handleChange} style={inputStyle} />
          <input name="price" type="number" step="0.01" placeholder="Price" value={form.price} onChange={handleChange} required style={inputStyle} />
          <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {formError && <p style={{ color: 'red' }}>{formError}</p>}
          <button type="submit" disabled={createItem.isPending} style={submitStyle}>Create</button>
        </form>
      )}

      {error && <p style={{ color: 'red' }}>{error instanceof Error ? error.message : 'Failed to load menu'}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginTop: 20 }}>
        {items.map((item: MenuItem) => (
          <div key={item._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
            <h3>{item.name}</h3>
            <p style={{ color: '#666' }}>{item.description}</p>
            <p><strong>${item.price.toFixed(2)}</strong> <span style={{ color: '#888' }}>({item.category})</span></p>
            {user?.role === 'admin' && (
              <button onClick={() => handleDelete(item._id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Menu;
