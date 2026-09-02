import React, { useState, useCallback } from 'react';
import { useAuth } from '../../store/authStore';
import { useDeleteUser, useUpdateUserRole, useUsers } from '../../api/queries';
import { ClientError } from 'graphql-request';
import ConfirmDialog from '../ConfirmDialog';

const ROLES = ['customer', 'staff', 'admin'] as const;
const roleColors: Record<string, string> = {
  admin: 'bg-red-500',
  staff: 'bg-blue-500',
  customer: 'bg-green-600',
};

const getGraphQLErrorMessage = (err: unknown): string => {
  if (err instanceof ClientError) return err.response.errors?.[0]?.message || err.message || 'Operation failed';
  if (err instanceof TypeError && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')))
    return 'Network error: backend is unavailable';
  if (err instanceof Error) return err.message || 'Operation failed';
  return 'Operation failed';
};

function UserRow({
  user,
  isCurrent,
  editing,
  onStartEdit,
  onRoleChange,
  onDelete,
}: {
  user: any;
  isCurrent: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onRoleChange: (role: string) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="table-td">{user.name}</td>
      <td className="table-td">{user.email}</td>
      <td className="table-td">
        {editing ? (
          <select
            value={user.role}
            onChange={(e) => onRoleChange(e.target.value)}
            onBlur={() => onRoleChange(user.role)}
            className="p-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`${roleColors[user.role]} text-white px-2.5 py-0.5 rounded-full text-xs ${!isCurrent ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity inline-block`}
            onClick={() => !isCurrent && onStartEdit()}
            title={!isCurrent ? 'Click to change role' : undefined}
          >
            {user.role}
          </span>
        )}
      </td>
      <td className="table-td">{user.phone || '-'}</td>
      <td className="table-td">
        {!isCurrent && (
          <button onClick={onDelete} className="btn-danger">
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

export default function UserTable() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const deleteUser = useDeleteUser();
  const updateUserRole = useUpdateUserRole();
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const handleDeleteUser = useCallback(async () => {
    if (deleteConfirm.id) {
      try {
        await deleteUser.mutateAsync(deleteConfirm.id);
      } catch (err) {
        alert(getGraphQLErrorMessage(err) || 'Delete failed');
      }
    }
    setDeleteConfirm({ open: false });
  }, [deleteConfirm.id, deleteUser]);

  const handleRoleChange = useCallback(
    async (id: string, role: string) => {
      try {
        await updateUserRole.mutateAsync({ id, role });
        setEditingRole(null);
      } catch (err) {
        alert(getGraphQLErrorMessage(err) || 'Role update failed');
      }
    },
    [updateUserRole],
  );

  return (
    <>
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1a1a2e] text-white">
              <th className="table-th">Name</th>
              <th className="table-th">Email</th>
              <th className="table-th">Role</th>
              <th className="table-th">Phone</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <UserRow
                key={u._id}
                user={u}
                isCurrent={u._id === currentUser?._id}
                editing={editingRole === u._id}
                onStartEdit={() => setEditingRole(u._id)}
                onRoleChange={(role) => handleRoleChange(u._id, role)}
                onDelete={() => setDeleteConfirm({ open: true, id: u._id })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
