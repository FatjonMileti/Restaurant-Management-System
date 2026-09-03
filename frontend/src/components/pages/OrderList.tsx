import React, { useState, useMemo, useCallback } from 'react';
import { useOrders, useUpdateOrderStatus, useDeleteOrder, Order } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import FilterBar from '../FilterBar';
import ConfirmDialog from '../ConfirmDialog';
import OrderCard from './OrderCard';

interface Props {
  onEditOrder: (order: Order) => void;
}

export default function OrderList({ onEditOrder }: Props) {
  const { user } = useAuth();
  const { data: orders = [], error: ordersError } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const [actionError, setActionError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({
    open: false,
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const handleUpdateStatus = useCallback(
    async (id: string, status: string) => {
      try {
        await updateStatus.mutateAsync({ id, status });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to update order status');
      }
    },
    [updateStatus],
  );

  const handleDeleteOrder = useCallback(async () => {
    if (deleteConfirm.id) {
      try {
        await deleteOrder.mutateAsync(deleteConfirm.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to delete order');
      }
    }
    setDeleteConfirm({ open: false });
  }, [deleteConfirm.id, deleteOrder]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirm({ open: true, id });
  }, []);

  const error = ordersError instanceof Error ? ordersError.message : actionError;

  const filteredOrders = useMemo(
    () =>
      orders.filter((order: Order) => {
        const matchesStatus = statusFilter ? order.status === statusFilter : true;
        const matchesTable = tableFilter
          ? order.tableNumber && String(order.tableNumber) === tableFilter
          : true;
        return matchesStatus && matchesTable;
      }),
    [orders, statusFilter, tableFilter],
  );

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
        <OrderCard
          key={order._id}
          order={order}
          isStaffView={user?.role !== 'customer'}
          isOwner={order.user?._id === user?._id}
          onEdit={onEditOrder}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteClick}
        />
      ))}
    </>
  );
}
