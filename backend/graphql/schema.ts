import { buildSchema } from 'graphql';
import User from '../models/User.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Reservation from '../models/Reservation.js';
import Category from '../models/Category.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    phone: String
    createdAt: String
    updatedAt: String
  }

  type MenuItem {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: String!
    image: String
    available: Boolean!
    createdAt: String
    updatedAt: String
  }

  type Category {
    id: ID!
    name: String!
    createdAt: String
    updatedAt: String
  }

  type OrderItem {
    menuItem: MenuItem
    name: String!
    quantity: Int!
    price: Float!
  }

  type Order {
    id: ID!
    user: User
    items: [OrderItem!]!
    totalAmount: Float!
    status: String!
    tableNumber: Int
    paymentMethod: String!
    createdAt: String
    updatedAt: String
  }

  type Reservation {
    id: ID!
    user: User
    date: String!
    time: String!
    guests: Int!
    tableNumber: Int
    status: String!
    specialRequests: String
    createdAt: String
    updatedAt: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input OrderItemInput {
    menuItem: ID!
    name: String!
    quantity: Int!
    price: Float!
  }

  input ReservationInput {
    date: String!
    time: String!
    guests: Int!
    tableNumber: Int
    specialRequests: String
  }

  type Query {
    hello: String

    authMe: User
    authUsers: [User!]!
    authProfile: User

    menuItems(category: String, available: Boolean): [MenuItem!]!
    menuItem(id: ID!): MenuItem

    orders(status: String, tableNumber: Int): [Order!]!
    order(id: ID!): Order

    reservations(status: String, tableNumber: Int): [Reservation!]!
    reservation(id: ID!): Reservation

    categories: [Category!]!
    category(id: ID!): Category
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, phone: String): AuthPayload
    login(email: String!, password: String!): AuthPayload

    createMenuItem(name: String!, description: String, price: Float!, category: String!, image: String): MenuItem
    updateMenuItem(id: ID!, name: String, description: String, price: Float, category: String, image: String, available: Boolean): MenuItem
    deleteMenuItem(id: ID!): String

    createOrder(items: [OrderItemInput!]!, tableNumber: Int, paymentMethod: String): Order
    updateOrder(id: ID!, items: [OrderItemInput!], tableNumber: Int, paymentMethod: String, status: String, totalAmount: Float): Order
    deleteOrder(id: ID!): String
    updateOrderStatus(id: ID!, status: String!): Order

    createReservation(date: String!, time: String!, guests: Int!, tableNumber: Int, specialRequests: String): Reservation
    updateReservation(id: ID!, date: String, time: String, guests: Int, tableNumber: Int, status: String, specialRequests: String): Reservation
    deleteReservation(id: ID!): String
    cancelReservation(id: ID!): Reservation

    createCategory(name: String!): Category
    updateCategory(id: ID!, name: String!): Category
    deleteCategory(id: ID!): String

    createUserByAdmin(name: String!, email: String!, password: String!, phone: String, role: String): User
    updateUserRole(id: ID!, role: String!): User
    deleteUser(id: ID!): String
  }
`);

function generateToken(id: string): string {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
}

const root = {
  hello: () => 'Hello from GraphQL',

  authMe: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    return User.findById(context.userId).select('-password');
  },

  authUsers: async () => User.find({}).select('-password'),

  authProfile: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    return User.findById(context.userId).select('-password');
  },

  menuItems: async ({ category, available }: any) => {
    const filter: any = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available;
    return MenuItem.find(filter).sort('category');
  },

  menuItem: async ({ id }: any) => MenuItem.findById(id),

  orders: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const orders = await Order.find(filter).populate('user', 'name email role _id').populate('items.menuItem').sort('-createdAt');
    console.log('DEBUG orders user:', orders[0] ? { userExists: !!(orders[0] as any).user, userId: (orders[0] as any).user ? (orders[0] as any).user._id : null, userName: (orders[0] as any).user ? (orders[0] as any).user.name : null } : 'no orders');
    return (orders as any[]).map((o: any) => {
      const userObj: any = o.user ? { id: o.user._id ? o.user._id.toString() : (o.user.id || null), name: o.user.name, email: o.user.email, role: o.user.role || 'customer' } : null;
      const itemsArr = (o.items || []).map((item: any) => {
        const menuItemObj: any = item.menuItem ? { id: item.menuItem._id ? item.menuItem._id.toString() : (item.menuItem.id || null), name: item.menuItem.name, description: item.menuItem.description, price: item.menuItem.price, category: item.menuItem.category, image: item.menuItem.image, available: item.menuItem.available, createdAt: item.menuItem.createdAt, updatedAt: item.menuItem.updatedAt } : null;
        return { name: item.name, quantity: item.quantity, price: item.price, menuItem: menuItemObj };
      });
      const orderAny: any = o;
      return { id: orderAny._id ? orderAny._id.toString() : (orderAny.id || null), user: userObj, items: itemsArr, totalAmount: orderAny.totalAmount, status: orderAny.status, tableNumber: orderAny.tableNumber, paymentMethod: orderAny.paymentMethod, createdAt: orderAny.createdAt, updatedAt: orderAny.updatedAt };
    });
  },

  order: async ({ id }: any) => {
    const doc: any = await Order.findById(id).populate('user', 'name email role _id').populate('items.menuItem');
    if (!doc) return null;
    const userObj: any = doc.user ? { id: doc.user._id ? doc.user._id.toString() : (doc.user.id || null), name: doc.user.name, email: doc.user.email, role: doc.user.role || 'customer' } : null;
    const itemsArr = (doc.items || []).map((item: any) => {
      const menuItemObj: any = item.menuItem ? { id: item.menuItem._id ? item.menuItem._id.toString() : (item.menuItem.id || null), name: item.menuItem.name, description: item.menuItem.description, price: item.menuItem.price, category: item.menuItem.category, image: item.menuItem.image, available: item.menuItem.available, createdAt: item.menuItem.createdAt, updatedAt: item.menuItem.updatedAt } : null;
      return { name: item.name, quantity: item.quantity, price: item.price, menuItem: menuItemObj };
    });
    const docAny: any = doc;
    return { id: docAny._id.toString(), user: userObj, items: itemsArr, totalAmount: docAny.totalAmount, status: docAny.status, tableNumber: docAny.tableNumber, paymentMethod: docAny.paymentMethod, createdAt: docAny.createdAt, updatedAt: docAny.updatedAt };
  },

  reservations: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    return Reservation.find(filter).populate('user', 'name email role _id').sort('-date');
  },

  reservation: async ({ id }: any) => {
    return Reservation.findById(id).populate('user', 'name email role _id');
  },

  categories: async () => Category.find().sort('name'),
  category: async ({ id }: any) => Category.findById(id),

  register: async ({ name, email, password, phone }: any) => {
    const existing = await User.findOne({ email });
    if (existing) throw new Error('User already exists');
    const user = await User.create({ name, email, password, phone, role: 'customer' });
    const token = generateToken(user._id.toString());
    return { token, user: { ...user.toObject(), id: user._id.toString(), password: undefined } };
  },

  login: async ({ email, password }: any) => {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) throw new Error('Invalid email or password');
    const token = generateToken(user._id.toString());
    return { token, user: { ...user.toObject(), id: user._id.toString(), password: undefined } };
  },

  createMenuItem: async ({ name, description, price, category, image }: any) => {
    return MenuItem.create({ name, description, price, category, image });
  },

  updateMenuItem: async ({ id, ...rest }: any) => {
    return MenuItem.findByIdAndUpdate(id, rest, { new: true, runValidators: true });
  },

  deleteMenuItem: async ({ id }: any) => {
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) throw new Error('Menu item not found');
    return 'Menu item removed';
  },

  createOrder: async ({ items, tableNumber, paymentMethod }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    if (!items || items.length === 0) throw new Error('Order must have at least one item');
    const menuItemIds = items.map((i: any) => i.menuItem);
    const existingItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    if (existingItems.length !== menuItemIds.length) throw new Error('One or more menu items not found');
    if (tableNumber) {
      const busyTable = await Order.findOne({ tableNumber, status: { $in: ['pending', 'preparing'] } });
      if (busyTable) throw new Error('Table is busy');
    }
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    return Order.create({ user: context.userId, items, totalAmount, tableNumber, paymentMethod });
  },

  updateOrder: async ({ id, ...rest }: any) => {
    const updates: any = { ...rest };
    if (rest.items) {
      updates.totalAmount = rest.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    }
    if (rest.tableNumber) {
      const busyTable = await Order.findOne({ tableNumber: rest.tableNumber, status: { $in: ['pending', 'preparing'] }, _id: { $ne: id } });
      if (busyTable) throw new Error('Table is busy');
    }
    return Order.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  },

  deleteOrder: async ({ id }: any) => {
    const order = await Order.findByIdAndDelete(id);
    if (!order) throw new Error('Order not found');
    return 'Order removed';
  },

  updateOrderStatus: async ({ id, status }: any) => {
    return Order.findByIdAndUpdate(id, { status }, { new: true });
  },

  createReservation: async ({ date, time, guests, tableNumber, specialRequests }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    return Reservation.create({ user: context.userId, date, time, guests, tableNumber, specialRequests });
  },

  updateReservation: async ({ id, ...rest }: any) => {
    return Reservation.findByIdAndUpdate(id, rest, { new: true, runValidators: true });
  },

  deleteReservation: async ({ id }: any) => {
    const res = await Reservation.findByIdAndDelete(id);
    if (!res) throw new Error('Reservation not found');
    return 'Reservation removed';
  },

  cancelReservation: async ({ id }: any) => {
    const res = await Reservation.findById(id);
    if (!res) throw new Error('Reservation not found');
    res.status = 'cancelled';
    await res.save();
    return res;
  },

  createCategory: async ({ name }: any) => Category.create({ name }),
  updateCategory: async ({ id, name }: any) => Category.findByIdAndUpdate(id, { name }, { new: true, runValidators: true }),
  deleteCategory: async ({ id }: any) => {
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) throw new Error('Category not found');
    return 'Category removed';
  },

  createUserByAdmin: async ({ name, email, password, phone, role }: any) => {
    const existing = await User.findOne({ email });
    if (existing) throw new Error('User already exists');
    const validRoles = ['customer', 'staff', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'customer';
    return User.create({ name, email, password, phone, role: userRole });
  },

  updateUserRole: async ({ id, role }: any) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    const validRoles = ['customer', 'staff', 'admin'];
    if (!validRoles.includes(role)) throw new Error('Invalid role');
    user.role = role;
    await user.save();
    return user;
  },

  deleteUser: async ({ id }: any) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') throw new Error('Cannot delete admin user');
    await user.deleteOne();
    return 'User removed';
  },
};

export { schema, root };
