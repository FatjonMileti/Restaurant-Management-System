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
  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

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

  const filteredOrders = orders.filter((order: Order) => {
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    const matchesTable = tableFilter ? (order.tableNumber && String(order.tableNumber) === tableFilter) : true;
    return matchesStatus && matchesTable;
  });

  return (
    <>
      <div className="bg-gray-50 p-3 rounded-lg shadow-sm flex gap-3 mb-4 items-center">
        <span className="text-sm font-semibold text-gray-700">Filter orders:</span>
        <label className="text-sm font-medium">Status:</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input-sm w-36">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label className="text-sm font-medium ml-2">Table:</label>
        <input type="number" placeholder="Table #" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="form-input-sm w-28" />
        {(statusFilter || tableFilter) && (
          <button onClick={() => { setStatusFilter(''); setTableFilter(''); }} className="btn-secondary text-xs">Clear</button>
        )}
      </div>
      {isLoading && <LoadingSpinner />}
      {error && !isLoading && <p className="error-text mt-3">{error}</p>}
      {filteredOrders.map((order: Order) => (
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
