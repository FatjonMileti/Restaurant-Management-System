import { memo } from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';
import { Button, IconButton, Tooltip } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Reservation } from '../../api/queries';
import StatusBadge from '../StatusBadge';

interface Props {
  reservation: Reservation;
  isStaff: boolean;
  isOwner: boolean;
  onEdit?: (res: Reservation) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

function ReservationCard({
  reservation: res,
  isStaff,
  isOwner,
  onEdit,
  onCancel,
  onDelete,
}: Props) {
  const canEdit = (isStaff || isOwner) && onEdit;

  return (
    <motion.div
      className={`card ${canEdit ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={canEdit ? () => onEdit(res) : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="flex justify-between">
        <div>
          <strong>
            {moment(res.date).format('DD/MM/YYYY')} at {res.time}
          </strong>
          <p className="text-sm">
            {res.guests} guest(s) {res.tableNumber ? `| Table ${res.tableNumber}` : ''}
          </p>
          {res.specialRequests && (
            <p className="text-gray-500 text-sm">Note: {res.specialRequests}</p>
          )}
          {isStaff && res.user && (
            <p className="text-gray-400 text-xs">
              By: {res.user.name} ({res.user.email})
            </p>
          )}
          {isStaff && (res.clientName || res.clientPhone || res.clientEmail) && (
            <p className="text-gray-400 text-xs">
              Client:{res.clientName ? ` ${res.clientName}` : ''}
              {res.clientPhone ? ` · ${res.clientPhone}` : ''}
              {res.clientEmail ? ` (${res.clientEmail})` : ''}
            </p>
          )}
          <p className="text-gray-400 text-xs">
            {moment(`${res.date} ${res.time}`, 'YYYY-MM-DD HH:mm').format('DD/MM/YYYY LT')}
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={res.status} className="text-sm" />
          {(isStaff || isOwner) && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              {res.status === 'confirmed' && (
                <>
                  <Button
                    onClick={() => onCancel(res._id)}
                    className="btn-danger-sm"
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    Cancel
                  </Button>
                  <Tooltip title="Cancel reservation">
                    <IconButton
                      aria-label="Cancel reservation"
                      color="error"
                      size="small"
                      sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                      onClick={() => onCancel(res._id)}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {(res.status === 'cancelled' || res.status === 'completed') && (
                <>
                  <Button
                    onClick={() => onDelete(res._id)}
                    className="btn-danger-sm"
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    Delete
                  </Button>
                  <Tooltip title="Delete reservation">
                    <IconButton
                      aria-label="Delete reservation"
                      color="error"
                      size="small"
                      sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                      onClick={() => onDelete(res._id)}
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

export default memo(ReservationCard);
