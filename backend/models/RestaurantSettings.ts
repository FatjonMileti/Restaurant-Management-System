import mongoose, { Document, Schema } from 'mongoose';

export interface IRestaurantSettings extends Document {
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  tableCount: number;
}

const restaurantSettingsSchema = new Schema<IRestaurantSettings>(
  {
    name: { type: String, required: true, default: 'Restaurant MS' },
    logo: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    tableCount: { type: Number, required: true, default: 10, min: 1 },
  },
  { timestamps: true }
);

export default mongoose.model<IRestaurantSettings>('RestaurantSettings', restaurantSettingsSchema);
