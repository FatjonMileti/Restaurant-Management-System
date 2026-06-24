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
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true },
    tableNumber: { type: Number },
    status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
    specialRequests: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IReservation>('Reservation', reservationSchema);
