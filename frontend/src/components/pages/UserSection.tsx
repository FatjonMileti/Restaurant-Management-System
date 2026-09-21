import React, { useState } from 'react';
import SectionCard from '../SectionCard';
import PageHeader from '../PageHeader';
import UserForm from './UserForm';
import UserTable from './UserTable';
import { AdminUser } from '../../api/queries';

export default function UserSection() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  return (
    <SectionCard>
      <PageHeader
        title="Users"
        action={
          <button
            onClick={() => {
              setEditingUser(null);
              setShowForm(!showForm);
            }}
            className="btn-secondary"
          >
            {showForm && !editingUser ? 'Cancel' : '+ Add User'}
          </button>
        }
        className="mb-4"
      />
      {showForm && (
        <UserForm editingUser={editingUser} onSuccess={handleClose} onCancel={handleClose} />
      )}
      <UserTable onEditUser={handleEditUser} />
    </SectionCard>
  );
}
