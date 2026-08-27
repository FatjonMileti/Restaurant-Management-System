import React, { useState } from 'react';
import { useOrders, useUpdateOrderStatus, useDeleteOrder, Order } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import LoadingSpinner from '../LoadingSpinner';

const statusColorMap: Record<string, string> = {
  pending: 'bg-amber-500',
  preparing: 'bg-blue-500',
  completed: 'bg-green-600',
  cancelled: 'bg-red-500',
};

interface Props {
  onEditOrder: (order: Order) => void;
}

export default function OrderList({ onEditOrder }: Props) {
  const { user } = useAuth();
  const { data: orders = [], error: ordersError, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const [actionError, setActionError] = React.useState('');

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

  const error = ordersError instanceof Error ? ordersError.message : actionError;

  return (
    <>
      {isLoading && <LoadingSpinner />}
      {error && !isLoading && <p className="error-text mt-3">{error}</p>}
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
                      <button onClick={() => onEditOrder(order)} className="btn-blue-sm">Edit</button>
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
        </div>
      ))}
    </>
  );
}
