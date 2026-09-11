import React, { useState, useMemo, useCallback } from 'react';
import {
  useOrders,
  useUpdateOrderStatus,
  useDeleteOrder,
  useUsers,
  Order,
} from '../../api/queries';
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
  const { data: users = [] } = useUsers();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const [actionError, setActionError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({
    open: false,
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const isStaffView = user?.role !== 'customer';

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
        const matchesUser = userFilter ? order.user?._id === userFilter : true;
        return matchesStatus && matchesTable && matchesUser;
      }),
    [orders, statusFilter, tableFilter, userFilter],
  );

  const userOptions = useMemo(() => {
    // All users (staff-readable users query), sorted by name. Falls back to
    // the users seen in the loaded orders if the list is unavailable.
    if (users.length > 0) {
      return [...users]
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
        .map((u) => ({ value: u._id, label: u.name || u.email }));
    }
    const seen = new Map<string, string>();
    orders.forEach((order: Order) => {
      if (order.user && !seen.has(order.user._id)) {
        seen.set(order.user._id, order.user.name || order.user.email);
      }
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [orders, users]);

  return (
    <>
      <FilterBar
        label="Filter orders:"
        theme="gray"
        options={[
          { value: '', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'preparing', label: 'Preparing' },
          { value: 'ready', label: 'Ready' },
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
        userOptions={isStaffView ? userOptions : undefined}
        userValue={userFilter}
        onUserChange={setUserFilter}
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
          isStaffView={isStaffView}
          isOwner={order.user?._id === user?._id}
          onEdit={onEditOrder}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteClick}
        />
      ))}
    </>
  );
}
