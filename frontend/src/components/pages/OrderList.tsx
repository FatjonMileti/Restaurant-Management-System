import React, { useState } from 'react';
import { useOrders, useUpdateOrderStatus, useDeleteOrder, useUpdateOrder, Order } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import { useMenu } from '../../api/queries';
import { useCartStore } from '../../store/cartStore';

const statusColorMap: Record<string, string> = {
  pending: 'bg-amber-500',
  preparing: 'bg-blue-500',
  completed: 'bg-green-600',
  cancelled: 'bg-red-500',
};

export default function OrderList() {
  const { user } = useAuth();
  const { data: orders = [], error: ordersError } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const updateOrder = useUpdateOrder();
  const [actionError, setActionError] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editOrder, setEditOrder] = React.useState<Order | null>(null);

  const { data: menu = [] } = useMenu();
  const cart = useCartStore();
  const menuItems = menu.filter((i) => i.available);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await deleteOrder.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const handleEditSubmit = async (id: string, items: any[], tableNumber?: number) => {
    try {
      await updateOrder.mutateAsync({ id, data: { items, tableNumber, status: 'pending' } });
      setEditingId(null);
      cart.clear();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to edit order');
    }
  };

  const error = ordersError instanceof Error ? ordersError.message : actionError;

  return (
    <>
      {error && <p className="error-text mt-3">{error}</p>}
      {orders.map((order: Order) => (
        <div key={order._id} className="card">
          <div className="flex justify-between">
            <div>
              <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
              {order.tableNumber && <span> | Table {order.tableNumber}</span>}
              <p className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleString()}</p>
              {order.user && user?.role !== 'customer' && (
                <p className="text-gray-400 text-xs">By: {order.user.name} ({order.user.email})</p>
              )}
              {order.items.map((item, i) => (
                <p key={i} className="text-sm mt-1">{item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}</p>
              ))}
              <p className="mt-2"><strong>Total: ${order.totalAmount.toFixed(2)}</strong></p>
            </div>
            <div className="text-right">
              <span className={`${statusColorMap[order.status] || 'bg-gray-500'} text-white px-3 py-1 rounded-full inline-block mb-2.5 text-sm capitalize`}>
                {order.status}
              </span>
              {((user?.role !== 'customer') || (user?.role === 'customer' && order.user?._id === user?._id)) && (
                <div className="flex flex-col gap-1.5 items-end">
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => { const isEditing = editingId === order._id; setEditingId(isEditing ? null : order._id); setEditOrder(isEditing ? null : order); if (!isEditing) { cart.replaceItems(order.items.map(i => ({ menuItem: i.menuItem || '', name: i.name, price: i.price, quantity: i.quantity }))); } else { cart.clear(); } }} className="btn-blue-sm">Edit</button>
                      <button onClick={() => handleUpdateStatus(order._id, 'preparing')} className="btn-blue-sm">Start Preparing</button>
                      <button onClick={() => handleUpdateStatus(order._id, 'cancelled')} className="btn-danger-sm">Cancel</button>
                    </>
                  )}
                  {order.status === 'preparing' && (
                    <>
                      <button onClick={() => handleUpdateStatus(order._id, 'completed')} className="btn-blue-sm">Mark Completed</button>
                      <button onClick={() => handleUpdateStatus(order._id, 'cancelled')} className="btn-danger-sm">Cancel</button>
                    </>
                  )}
                  {(order.status === 'completed' || order.status === 'cancelled') && (
                    <button onClick={() => handleDeleteOrder(order._id)} className="btn-danger-sm">Delete</button>
                  )}
                </div>
              )}
            </div>
          </div>
          {editingId === order._id && order.status === 'pending' && (
            <div className="bg-gray-100 p-4 rounded-md mt-3">
              <h4 className="font-semibold mb-2">Edit Order</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {menuItems.map((item) => (
                  <button key={item._id} type="button" onClick={() => cart.addItem(item)} className="px-3 py-1 bg-[#0f3460] text-white border-none rounded-md cursor-pointer hover:bg-[#16213e] transition-colors text-xs">
                    {item.name} - ${item.price.toFixed(2)}
                  </button>
                ))}
              </div>
              {cart.items.length > 0 && (
                <>
                  <div className="bg-white p-3 rounded-md mb-2">
                    {cart.items.map((c) => (
                      <div key={c.menuItem} className="flex justify-between text-sm mb-1">
                        <span>{c.name} x{c.quantity}</span>
                        <span>${(c.price * c.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleEditSubmit(order._id, cart.items.map(i => ({ menuItem: i.menuItem, name: i.name, price: i.price, quantity: i.quantity })), order.tableNumber)} className="btn-primary">Save Changes</button>
                  <button onClick={() => { setEditingId(null); cart.clear(); }} className="btn-secondary ml-2">Cancel</button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
