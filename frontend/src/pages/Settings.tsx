import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { useAuth } from '../store/authStore';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUserRole,
  useUsers,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  Category,
} from '../api/queries';

const ROLES = ['customer', 'staff', 'admin'] as const;
const roleColors: Record<string, string> = { admin: 'bg-red-500', staff: 'bg-blue-500', customer: 'bg-green-600' };

interface UserForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
}

function Settings() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: categoriesData = [] } = useCategories();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateUserRole = useUpdateUserRole();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const { register, handleSubmit, reset } = useForm<UserForm>({
    defaultValues: { name: '', email: '', password: '', phone: '', role: 'customer' },
  });

  const onSubmit = async (data: UserForm) => {
    try {
      await createUser.mutateAsync(data);
      reset();
      setShowForm(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      alert(axiosErr.response?.data?.message || 'Create failed');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await deleteUser.mutateAsync(id);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      alert(axiosErr.response?.data?.message || 'Delete failed');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await updateUserRole.mutateAsync({ id, role });
      setEditingRole(null);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      alert(axiosErr.response?.data?.message || 'Role update failed');
    }
  };

  const handleCreateCategory = async () => {
    try {
      if (!newCategoryName.trim()) return;
      await createCategory.mutateAsync({ name: newCategoryName.trim() });
      setNewCategoryName('');
    } catch (err) {
      alert((err as Error)?.message || 'Failed to create category');
    }
  };

  const handleEditCategory = async () => {
    try {
      if (!editCategoryId || !editCategoryName.trim()) return;
      await updateCategory.mutateAsync({ id: editCategoryId, name: editCategoryName.trim() });
      setEditCategoryId(null);
      setEditCategoryName('');
    } catch (err) {
      alert((err as Error)?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteCategory.mutateAsync(id);
    } catch (err) {
      alert((err as Error)?.message || 'Failed to delete category');
    }
  };

  const inputClass = "w-full p-2.5 mb-2.5 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-5">Settings</h2>

      {/* User Management */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Users</h3>
          <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-[#16a085] text-white border-none rounded-md cursor-pointer hover:bg-[#138d75] transition-colors">
            {showForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-100 p-5 rounded-lg mb-5">
            <input placeholder="Name" {...register('name', { required: true })} className={inputClass} />
            <input type="email" placeholder="Email" {...register('email', { required: true })} className={inputClass} />
            <input type="password" placeholder="Password" {...register('password', { required: true })} className={inputClass} />
            <input placeholder="Phone" {...register('phone')} className={inputClass} />
            <select {...register('role')} className={inputClass}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="submit" className="px-6 py-2.5 bg-[#e94560] text-white border-none rounded-md cursor-pointer hover:bg-[#d63d54] transition-colors">Create User</button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#1a1a2e] text-white">
                <th className="p-3 text-left text-sm font-semibold">Name</th>
                <th className="p-3 text-left text-sm font-semibold">Email</th>
                <th className="p-3 text-left text-sm font-semibold">Role</th>
                <th className="p-3 text-left text-sm font-semibold">Phone</th>
                <th className="p-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="p-2.5">{u.name}</td>
                  <td className="p-2.5">{u.email}</td>
                  <td className="p-2.5">
                    {editingRole === u._id ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        onBlur={() => setEditingRole(null)}
                        className="p-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span
                        className={`${roleColors[u.role]} text-white px-2.5 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-90 transition-opacity inline-block`}
                        onClick={() => u._id !== currentUser?._id && setEditingRole(u._id)}
                        title="Click to change role"
                      >
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5">{u.phone || '-'}</td>
                  <td className="p-2.5">
                    {u._id !== currentUser?._id && (
                      <button onClick={() => handleDeleteUser(u._id)} className="bg-red-500 text-white border-none px-3 py-1.5 rounded cursor-pointer hover:bg-red-600 transition-colors text-sm">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Categories Management */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Categories</h3>

        <div className="flex gap-2 mb-5">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            className={inputClass}
          />
          <button
            onClick={handleCreateCategory}
            className="px-4 py-2.5 bg-[#3498db] text-white border-none rounded-md cursor-pointer hover:bg-[#2980b9] transition-colors whitespace-nowrap"
          >
            Add Category
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categoriesData.map((cat: Category) => (
            <div key={cat._id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-blue-200 shadow-sm">
              {editCategoryId === cat._id ? (
                <>
                  <input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="w-32 p-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                  <button onClick={handleEditCategory} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                  <button
                    onClick={() => { setEditCategoryId(null); setEditCategoryName(''); }}
                    className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">{cat.name}</span>
                  <button
                    onClick={() => {
                      setEditCategoryId(cat._id);
                      // Default data that is in the database
                      setEditCategoryName(cat.name);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDeleteCategory(cat._id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings;
