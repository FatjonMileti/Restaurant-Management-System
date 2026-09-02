import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOrderItem {
  menuItem: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  tableNumber?: number;
  paymentMethod: 'cash' | 'card';
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    tableNumber: { type: Number, index: true },
    paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, tableNumber: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model<IOrder>('Order', orderSchema);
