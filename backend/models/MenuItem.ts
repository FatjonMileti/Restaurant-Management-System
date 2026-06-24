import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price: number;
  category: 'appetizer' | 'main' | 'dessert' | 'beverage';
  image?: string;
  available: boolean;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, enum: ['appetizer', 'main', 'dessert', 'beverage'], required: true },
    image: { type: String },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
