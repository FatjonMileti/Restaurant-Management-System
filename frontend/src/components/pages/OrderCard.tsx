import React, { memo, useCallback } from 'react';
import { Order } from '../../api/queries';
import StatusBadge from '../StatusBadge';

interface Props {
  order: Order;
  isStaffView: boolean;
  isOwner: boolean;
  onEdit: (order: Order) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

function OrderCard({ order, isStaffView, isOwner, onEdit, onUpdateStatus, onDelete }: Props) {
  const canAct = isStaffView || isOwner;

  return (
    <div className="card">
      <div className="flex justify-between">
        <div>
          <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
          {order.tableNumber && <span> | Table {order.tableNumber}</span>}
          <p className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleString()}</p>
          {order.user && isStaffView && (
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
          {canAct && (
            <div className="flex flex-col gap-1.5 items-end">
              {order.status === 'pending' && (
                <>
                  <button onClick={() => onEdit(order)} className="btn-blue-sm">
                    Edit
                  </button>
                  <button onClick={() => onUpdateStatus(order._id, 'preparing')} className="btn-blue-sm">
                    Start Preparing
                  </button>
                  <button onClick={() => onUpdateStatus(order._id, 'cancelled')} className="btn-danger-sm">
                    Cancel
                  </button>
                </>
              )}
              {order.status === 'preparing' && (
                <>
                  <button onClick={() => onUpdateStatus(order._id, 'completed')} className="btn-blue-sm">
                    Mark Completed
                  </button>
                  <button onClick={() => onUpdateStatus(order._id, 'cancelled')} className="btn-danger-sm">
                    Cancel
                  </button>
                </>
              )}
              {(order.status === 'completed' || order.status === 'cancelled') && (
                <button onClick={() => onDelete(order._id)} className="btn-danger-sm">
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(OrderCard);
