import React, { memo } from 'react';
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

function ReservationCard({ reservation: res, isStaff, isOwner, onEdit, onCancel, onDelete }: Props) {
  const canEdit = (isStaff || isOwner) && onEdit;

  return (
    <div
      className={`card ${canEdit ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={canEdit ? () => onEdit(res) : undefined}
    >
      <div className="flex justify-between">
        <div>
          <strong>
            {new Date(res.date).toLocaleDateString()} at {res.time}
          </strong>
          <p className="text-sm">
            {res.guests} guest(s) {res.tableNumber ? `| Table ${res.tableNumber}` : ''}
          </p>
          {res.specialRequests && <p className="text-gray-500 text-sm">Note: {res.specialRequests}</p>}
          {isStaff && res.user && (
            <p className="text-gray-400 text-xs">
              By: {res.user.name} ({res.user.email})
            </p>
          )}
          <p className="text-gray-400 text-xs">{new Date(res.createdAt).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <StatusBadge status={res.status} className="text-sm" />
          {(isStaff || isOwner) && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              {res.status === 'confirmed' && (
                <button onClick={() => onCancel(res._id)} className="btn-danger-sm">
                  Cancel
                </button>
              )}
              {(res.status === 'cancelled' || res.status === 'completed') && (
                <button onClick={() => onDelete(res._id)} className="btn-danger-sm">
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

export default memo(ReservationCard);
