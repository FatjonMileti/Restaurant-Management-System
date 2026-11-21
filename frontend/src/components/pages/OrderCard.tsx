import { memo } from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
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
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="flex justify-between">
        <div>
          <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
          {order.tableNumber && <span> | Table {order.tableNumber}</span>}
          <p className="text-gray-500 text-sm">
            {moment(order.createdAt).format('DD/MM/YYYY, HH:mm:ss')}
          </p>
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
                  <button onClick={() => onEdit(order)} className="btn-blue-sm !hidden sm:!inline-flex">
                    Edit
                  </button>
                  <Tooltip title="Edit order">
                    <IconButton
                      aria-label="Edit order"
                      color="primary"
                      size="small"
                      className="sm:!hidden"
                      onClick={() => onEdit(order)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <button
                    onClick={() => onUpdateStatus(order._id, 'preparing')}
                    className="btn-blue-sm !hidden sm:!inline-flex"
                  >
                    Start Preparing
                  </button>
                  <Tooltip title="Start preparing">
                    <IconButton
                      aria-label="Start preparing"
                      color="primary"
                      size="small"
                      className="sm:!hidden"
                      onClick={() => onUpdateStatus(order._id, 'preparing')}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <button
                    onClick={() => onUpdateStatus(order._id, 'cancelled')}
                    className="btn-danger-sm !hidden sm:!inline-flex"
                  >
                    Cancel
                  </button>
                  <Tooltip title="Cancel order">
                    <IconButton
                      aria-label="Cancel order"
                      color="error"
                      size="small"
                      className="sm:!hidden"
                      onClick={() => onUpdateStatus(order._id, 'cancelled')}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {order.status === 'ready' && (
                <>
                  <button
                    onClick={() => onUpdateStatus(order._id, 'completed')}
                    className="btn-blue-sm !hidden sm:!inline-flex"
                  >
                    Mark Completed
                  </button>
                  <Tooltip title="Mark completed">
                    <IconButton
                      aria-label="Mark completed"
                      color="primary"
                      size="small"
                      className="sm:!hidden"
                      onClick={() => onUpdateStatus(order._id, 'completed')}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {order.status === 'preparing' && (
                <>
                  <button
                    onClick={() => onUpdateStatus(order._id, 'ready')}
                    className="btn-blue-sm !hidden sm:!inline-flex"
                  >
                    Mark Ready
                  </button>
                  <Tooltip title="Mark ready">
                    <IconButton
                      aria-label="Mark ready"
                      color="primary"
                      size="small"
                      className="sm:!hidden"
                      onClick={() => onUpdateStatus(order._id, 'ready')}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <button
                    onClick={() => onUpdateStatus(order._id, 'cancelled')}
                    className="btn-danger-sm !hidden sm:!inline-flex"
                  >
                    Cancel
                  </button>
                  <Tooltip title="Cancel order">
                    <IconButton
                      aria-label="Cancel order"
                      color="error"
                      size="small"
                      className="sm:!hidden"
                      onClick={() => onUpdateStatus(order._id, 'cancelled')}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {(order.status === 'completed' || order.status === 'cancelled') && (
                <>
                  <button
                    onClick={() => onDelete(order._id)}
                    className="btn-danger-sm !hidden sm:!inline-flex"
                  >
                    Delete
                  </button>
                <Tooltip title="Delete order">
                  <IconButton
                    aria-label="Delete order"
                    color="error"
                    size="small"
                    className="sm:!hidden"
                    onClick={() => onDelete(order._id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(OrderCard);
