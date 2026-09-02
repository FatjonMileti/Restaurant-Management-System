import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReservation extends Document {
  user: Types.ObjectId;
  date: Date;
  time: string;
  guests: number;
  tableNumber?: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  specialRequests?: string;
}

const reservationSchema = new Schema<IReservation>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true },
    tableNumber: { type: Number, index: true },
    status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed', index: true },
    specialRequests: { type: String },
  },
  { timestamps: true },
);

reservationSchema.index({ status: 1, tableNumber: 1 });
reservationSchema.index({ date: -1 });

export default mongoose.model<IReservation>('Reservation', reservationSchema);
