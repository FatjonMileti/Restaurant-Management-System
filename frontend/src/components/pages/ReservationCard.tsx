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
  onStatusChange: (id: string, status: string) => void;
}

function ReservationCard({ reservation: res, isStaff, isOwner, onEdit, onCancel, onDelete, onStatusChange }: Props) {
  return (
    <div className="card">
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
          {isStaff && (
            <div className="mt-2">
              <select
                value={res.status}
                onChange={(e) => onStatusChange(res._id, e.target.value)}
                className="form-input-sm !mb-0 w-32 text-xs py-1"
              >
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          {(isStaff || isOwner) && (
            <div className="mt-2.5">
              {res.status === 'confirmed' && (
                <>
                  <button onClick={() => onEdit?.(res)} className="btn-blue-sm">
                    Edit
                  </button>
                  <button onClick={() => onCancel(res._id)} className="btn-danger-sm ml-1">
                    Cancel
                  </button>
                </>
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
