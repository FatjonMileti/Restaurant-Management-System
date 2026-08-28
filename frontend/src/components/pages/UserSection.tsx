import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Box, Typography, Button, Paper, TextField, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useAuth } from '../../store/authStore';
import { useCreateUser, useDeleteUser, useUpdateUserRole, useUsers } from '../../api/queries';
import SectionCard from '../SectionCard';
import ConfirmDialog from '../ConfirmDialog';

const ROLES = ['customer', 'staff', 'admin'] as const;
const roleColors: Record<string, string> = { admin: 'bg-red-500', staff: 'bg-blue-500', customer: 'bg-green-600' };

interface UserForm {
  name: string; email: string; password: string; phone: string; role: string;
}

export default function UserSection() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateUserRole = useUpdateUserRole();
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; id?: string }>({ open: false });
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<UserForm>({ defaultValues: { name: '', email: '', password: '', phone: '', role: 'customer' } });

  const onSubmit = async (data: UserForm) => {
    try { await createUser.mutateAsync(data); reset(); setShowForm(false); } catch (err) { alert((err as AxiosError<{message:string}>).response?.data?.message || 'Create failed'); }
  };
  const handleDeleteUser = async () => {
    if (deleteConfirm.id) {
      try { await deleteUser.mutateAsync(deleteConfirm.id); } catch (err) { alert((err as AxiosError<{message:string}>).response?.data?.message || 'Delete failed'); }
    }
    setDeleteConfirm({ open: false });
  };
  const handleRoleChange = async (id: string, role: string) => { try { await updateUserRole.mutateAsync({ id, role }); setEditingRole(null); } catch (err) { alert((err as AxiosError<{message:string}>).response?.data?.message || 'Role update failed'); } };

  return (
    <SectionCard>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Users</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary">{showForm ? 'Cancel' : '+ Add User'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-100 p-5 rounded-lg mb-5">
          <input placeholder="Name" {...register('name', { required: true })} className="form-input-sm" />
          <input type="email" placeholder="Email" {...register('email', { required: true })} className="form-input-sm" />
          <input type="password" placeholder="Password" {...register('password', { required: true })} className="form-input-sm" />
          <input placeholder="Phone" {...register('phone')} className="form-input-sm" />
          <select {...register('role')} className="form-input-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="btn-primary">Create User</button>
        </form>
      )}
      <ConfirmDialog open={deleteConfirm.open} title="Delete User" message="Are you sure you want to delete this user?" onConfirm={handleDeleteUser} onCancel={() => setDeleteConfirm({ open: false })} />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="bg-[#1a1a2e] text-white">
            <th className="table-th">Name</th><th className="table-th">Email</th><th className="table-th">Role</th><th className="table-th">Phone</th><th className="table-th">Actions</th>
          </tr></thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="table-td">{u.name}</td><td className="table-td">{u.email}</td>
                <td className="table-td">
                  {editingRole === u._id ? (
                    <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} onBlur={() => setEditingRole(null)} className="p-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className={`${roleColors[u.role]} text-white px-2.5 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-90 transition-opacity inline-block`} onClick={() => u._id !== currentUser?._id && setEditingRole(u._id)} title="Click to change role">{u.role}</span>
                  )}
                </td>
                <td className="table-td">{u.phone || '-'}</td>
                <td className="table-td">{u._id !== currentUser?._id && <button onClick={() => setDeleteConfirm({ open: true, id: u._id })} className="btn-danger">Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
