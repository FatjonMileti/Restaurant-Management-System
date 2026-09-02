import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true, index: true },
    image: { type: String },
    available: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

menuItemSchema.index({ category: 1, available: 1 });

export default mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
