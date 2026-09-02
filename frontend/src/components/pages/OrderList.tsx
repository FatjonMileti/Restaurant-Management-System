import React, { useState } from 'react';
import { useOrders, useUpdateOrderStatus, useDeleteOrder, Order } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import StatusBadge from '../StatusBadge';
import FilterBar from '../FilterBar';
import ConfirmDialog from '../ConfirmDialog';

interface Props {
  onEditOrder: (order: Order) => void;
}

export default function OrderList({ onEditOrder }: Props) {
  const { user } = useAuth();
  const { data: orders = [], error: ordersError } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const [actionError, setActionError] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; id?: string }>({
    open: false,
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  const handleDeleteOrder = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteOrder.mutateAsync(deleteConfirm.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to delete order');
      }
    }
    setDeleteConfirm({ open: false });
  };

  const error = ordersError instanceof Error ? ordersError.message : actionError;

  const filteredOrders = orders.filter((order: Order) => {
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    const matchesTable = tableFilter
      ? order.tableNumber && String(order.tableNumber) === tableFilter
      : true;
    return matchesStatus && matchesTable;
  });

  return (
    <>
      <FilterBar
        label="Filter orders:"
        theme="gray"
        options={[
          { value: '', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'preparing', label: 'Preparing' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        inputPlaceholder="Table #"
        inputValue={tableFilter}
        onInputChange={setTableFilter}
        inputType="number"
        useTableSelect
      />

      {error && <p className="error-text mt-3">{error}</p>}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Order"
        message="Are you sure you want to delete this order?"
        onConfirm={handleDeleteOrder}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
      {filteredOrders.map((order: Order) => (
        <div key={order._id} className="card">
          <div className="flex justify-between">
            <div>
              <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
              {order.tableNumber && <span> | Table {order.tableNumber}</span>}
              <p className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleString()}</p>
              {order.user && user?.role !== 'customer' && (
                <p className="text-gray-400 text-xs">
                  By: {order.user.name} ({order.user.email})
                </p>
              )}
              {order.items.map((item, i) => (
                <p key={i} className="text-sm mt-1">
                  {item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                </p>
              ))}
              <p className="mt-2">
                <strong>Total: ${order.totalAmount.toFixed(2)}</strong>
              </p>
            </div>
            <div className="text-right">
              <StatusBadge status={order.status} className="mb-2.5 text-sm" />
              {(user?.role !== 'customer' ||
                (user?.role === 'customer' && order.user?._id === user?._id)) && (
                <div className="flex flex-col gap-1.5 items-end">
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => onEditOrder(order)} className="btn-blue-sm">
                        Edit
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'preparing')}
                        className="btn-blue-sm"
                      >
                        Start Preparing
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                        className="btn-danger-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'preparing' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'completed')}
                        className="btn-blue-sm"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                        className="btn-danger-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {(order.status === 'completed' || order.status === 'cancelled') && (
                    <button
                      onClick={() => setDeleteConfirm({ open: true, id: order._id })}
                      className="btn-danger-sm"
                    >
                      Delete
                    </button>
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
