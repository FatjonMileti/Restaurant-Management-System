import React, { useState } from 'react';
import { useAuth } from '../store/authStore';
import OrderFormComponent from '../components/pages/OrderForm';
import OrderList from '../components/pages/OrderList';
import { Order } from '../api/queries';

export default function Orders() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Orders</h2>
        {user?.role !== 'customer' && (
          <button onClick={() => { setShowCreate(!showCreate); setEditingOrder(null); }} className="btn-secondary">
            {showCreate ? 'Cancel' : '+ New Order'}
          </button>
        )}
      </div>
      <OrderFormComponent
        showCreate={showCreate}
        setShowCreate={setShowCreate}
        editingOrder={editingOrder}
        onEditDone={() => { setEditingOrder(null); }}
      />
      <OrderList onEditOrder={(order) => { setEditingOrder(order); }} />
    </div>
  );
}
