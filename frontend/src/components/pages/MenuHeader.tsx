import React from 'react';
import { useAuth } from '../../store/authStore';

interface Props {
  showForm: boolean;
  toggleForm: () => void;
}

export default function MenuHeader({ showForm, toggleForm }: Props) {
  const { user } = useAuth();

  return (
    <div className="page-header">
      <h2 className="page-title">Menu</h2>
      {user?.role === 'admin' && (
        <button onClick={toggleForm} className="btn-secondary">
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      )}
    </div>
  );
}
