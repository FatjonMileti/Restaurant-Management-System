import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { AxiosError } from 'axios';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

const ROLES = ['customer', 'staff', 'admin'] as const;
const roleColors: Record<string, string> = { admin: '#e74c3c', staff: '#3498db', customer: '#27ae60' };

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

const thStyle: React.CSSProperties = { padding: 12, textAlign: 'left', fontSize: '0.9rem' };
const tdStyle: React.CSSProperties = { padding: 10 };

function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'customer' });
  const [editingRole, setEditingRole] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await API.get<User[]>('/auth/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post('/auth/users', form);
      setForm({ name: '', email: '', password: '', phone: '', role: 'customer' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      alert(axiosErr.response?.data?.message || 'Create failed');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await API.delete(`/auth/users/${id}`);
      fetchUsers();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      alert(axiosErr.response?.data?.message || 'Delete failed');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await API.patch(`/auth/users/${id}/role`, { role });
      setEditingRole(null);
      fetchUsers();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      alert(axiosErr.response?.data?.message || 'Role update failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin Panel</h2>
        <button onClick={() => setShowForm(!showForm)} style={addBtnStyle}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={inputStyle} />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={inputStyle} />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required style={inputStyle} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} style={inputStyle} />
          <select name="role" value={form.role} onChange={handleChange} style={inputStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" style={submitStyle}>Create User</button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ background: '#1a1a2e', color: '#fff' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={tdStyle}>{u.name}</td>
              <td style={tdStyle}>{u.email}</td>
              <td style={tdStyle}>
                {editingRole === u._id ? (
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    onBlur={() => setEditingRole(null)}
                    style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                    autoFocus
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span
                    style={{ background: roleColors[u.role], color: '#fff', padding: '2px 10px', borderRadius: 10, fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => u._id !== currentUser?._id && setEditingRole(u._id)}
                    title="Click to change role"
                  >
                    {u.role}
                  </span>
                )}
              </td>
              <td style={tdStyle}>{u.phone || '-'}</td>
              <td style={tdStyle}>
                {u._id !== currentUser?._id && (
                  <button onClick={() => handleDeleteUser(u._id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer' }}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Admin;
