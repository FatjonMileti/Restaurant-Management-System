import React, { useState } from 'react';
import SectionCard from '../SectionCard';
import PageHeader from '../PageHeader';
import UserForm from './UserForm';
import UserTable from './UserTable';

export default function UserSection() {
  const [showForm, setShowForm] = useState(false);

  return (
    <SectionCard>
      <PageHeader
        title="Users"
        action={
          <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
            {showForm ? 'Cancel' : '+ Add User'}
          </button>
        }
        className="mb-4"
      />
      {showForm && (
        <UserForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      )}
      <UserTable />
    </SectionCard>
  );
}
