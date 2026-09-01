import { buildSchema } from 'graphql';
import moment from 'moment';
import User from '../models/User.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Reservation from '../models/Reservation.js';
import Category from '../models/Category.js';
import RestaurantSettings from '../models/RestaurantSettings.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { emitEvent } from '../socket.js';
import {
  registerSchema,
  loginSchema,
  menuItemSchema,
  createOrderSchema,
  updateOrderSchema,
  reservationSchema,
  categorySchema,
  restaurantSettingsSchema,
  createUserSchema,
  updateUserRoleSchema,
  validate,
} from './validation.js';

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

  type RestaurantSettings {
    id: ID!
    name: String!
    logo: String
    address: String
    phone: String
    email: String
    tableCount: Int!
    createdAt: String
    updatedAt: String
  }

  type TableStatus {
    number: Int!
    isBusy: Boolean!
    busyType: String
    occupiedBy: String
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

    restaurantSettings: RestaurantSettings
    tables: [TableStatus!]!
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

    updateRestaurantSettings(name: String, logo: String, address: String, phone: String, email: String, tableCount: Int): RestaurantSettings
  }
`);

const formatUser = (userDoc: any) => {
  if (!userDoc) return null;
  const d = userDoc.toObject ? userDoc.toObject() : userDoc;
  return {
    id: d._id ? d._id.toString() : d.id || '',
    name: d.name || '',
    email: d.email || '',
    role: d.role || 'customer',
    phone: d.phone || null,
    createdAt: d.createdAt ? moment(d.createdAt).format('YYYY-MM-DD HH:mm:ss') : d.createdAt,
    updatedAt: d.updatedAt ? moment(d.updatedAt).format('YYYY-MM-DD HH:mm:ss') : d.updatedAt,
  };
};

function generateToken(id: string): string {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
}

const formatRestaurantSettings = (doc: any) => {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id ? d._id.toString() : d.id || '',
    name: d.name,
    logo: d.logo || '',
    address: d.address || '',
    phone: d.phone || '',
    email: d.email || '',
    tableCount: d.tableCount,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
};

const getOrCreateRestaurantSettings = async () => {
  let settings = await RestaurantSettings.findOne();
  if (!settings) {
    settings = await RestaurantSettings.create({
      name: 'Restaurant MS',
      logo: '',
      address: '',
      phone: '',
      email: '',
      tableCount: 10,
    });
  }
  return settings;
};

const requireAuth = async (context: any) => {
  if (!context?.userId) throw new Error('Not authenticated');
  const user = await User.findById(context.userId);
  if (!user) throw new Error('Not authenticated');
  return user;
};

const requireAdmin = async (context: any) => {
  const user = await requireAuth(context);
  if (user.role !== 'admin') throw new Error('Not authorized, admin only');
  return user;
};

const root = {
  hello: () => 'Hello from GraphQL',

  authMe: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    const user = await User.findById(context.userId).select('-password');
    return formatUser(user);
  },

  authUsers: async () => {
    const users = await User.find({}).select('-password');
    return users.map(formatUser);
  },

  authProfile: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    const user = await User.findById(context.userId).select('-password');
    return formatUser(user);
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
    const orders = await Order.find(filter)
      .populate('user', 'name email role _id')
      .populate('items.menuItem')
      .sort('-createdAt');
    return (orders as any[]).map((o: any) => {
      const userObj = formatUser(o.user);
      const itemsArr = (o.items || []).map((item: any) => {
        const menuItemObj: any = item.menuItem
          ? {
              id: item.menuItem._id ? item.menuItem._id.toString() : item.menuItem.id || null,
              name: item.menuItem.name,
              description: item.menuItem.description,
              price: item.menuItem.price,
              category: item.menuItem.category,
              image: item.menuItem.image,
              available: item.menuItem.available,
              createdAt: item.menuItem.createdAt,
              updatedAt: item.menuItem.updatedAt,
            }
          : null;
        return {
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          menuItem: menuItemObj,
        };
      });
      const orderAny: any = o;
      return {
        id: orderAny._id ? orderAny._id.toString() : orderAny.id || null,
        user: userObj,
        items: itemsArr,
        totalAmount: orderAny.totalAmount,
        status: orderAny.status,
        tableNumber: orderAny.tableNumber,
        paymentMethod: orderAny.paymentMethod,
        createdAt: orderAny.createdAt,
        updatedAt: orderAny.updatedAt,
      };
    });
  },

  order: async ({ id }: any) => {
    const doc: any = await Order.findById(id)
      .populate('user', 'name email role _id')
      .populate('items.menuItem');
    if (!doc) return null;
    const userObj = formatUser(doc.user);
    const itemsArr = (doc.items || []).map((item: any) => {
      const menuItemObj: any = item.menuItem
        ? {
            id: item.menuItem._id ? item.menuItem._id.toString() : item.menuItem.id || null,
            name: item.menuItem.name,
            description: item.menuItem.description,
            price: item.menuItem.price,
            category: item.menuItem.category,
            image: item.menuItem.image,
            available: item.menuItem.available,
            createdAt: item.menuItem.createdAt,
            updatedAt: item.menuItem.updatedAt,
          }
        : null;
      return { name: item.name, quantity: item.quantity, price: item.price, menuItem: menuItemObj };
    });
    const docAny: any = doc;
    return {
      id: docAny._id.toString(),
      user: userObj,
      items: itemsArr,
      totalAmount: docAny.totalAmount,
      status: docAny.status,
      tableNumber: docAny.tableNumber,
      paymentMethod: docAny.paymentMethod,
      createdAt: docAny.createdAt,
      updatedAt: docAny.updatedAt,
    };
  },

  reservations: async ({ status, tableNumber }: any) => {
    const filter: any = {};
    if (status) filter.status = status;
    if (tableNumber !== undefined) filter.tableNumber = tableNumber;
    const docs = await Reservation.find(filter)
      .populate('user', 'name email role _id')
      .sort('-date');
    return docs.map((doc: any) => {
      const d = doc.toObject ? doc.toObject() : doc;
      const userObj = formatUser(d.user);
      return {
        ...d,
        id: d._id ? d._id.toString() : d.id || null,
        user: userObj,
        date: d.date ? moment(d.date).format('YYYY-MM-DD') : d.date,
      };
    });
  },

  reservation: async ({ id }: any) => {
    const doc: any = await Reservation.findById(id).populate('user', 'name email role _id');
    if (!doc) return null;
    const d = doc.toObject ? doc.toObject() : doc;
    const userObj = formatUser(d.user);
    return {
      ...d,
      id: d._id ? d._id.toString() : d.id || null,
      user: userObj,
      date: d.date ? moment(d.date).format('YYYY-MM-DD') : d.date,
    };
  },

  categories: async () => Category.find().sort('name'),
  category: async ({ id }: any) => Category.findById(id),

  restaurantSettings: async () => {
    const settings = await getOrCreateRestaurantSettings();
    return formatRestaurantSettings(settings);
  },

  tables: async () => {
    const settings = await getOrCreateRestaurantSettings();
    const count = settings.tableCount || 10;
    const busyOrders = await Order.find({
      status: { $in: ['pending', 'preparing'] },
      tableNumber: { $exists: true, $ne: null },
    });
    const confirmedReservations = await Reservation.find({
      status: 'confirmed',
      tableNumber: { $exists: true, $ne: null },
    });
    const orderMap = new Map<number, any>();
    busyOrders.forEach((o: any) => {
      if (o.tableNumber) orderMap.set(o.tableNumber, { type: 'order', doc: o });
    });
    const reservationMap = new Map<number, any>();
    confirmedReservations.forEach((r: any) => {
      if (r.tableNumber && !orderMap.has(r.tableNumber))
        reservationMap.set(r.tableNumber, { type: 'reservation', doc: r });
    });
    const result: any[] = [];
    for (let i = 1; i <= count; i++) {
      if (orderMap.has(i)) {
        const occupied = orderMap.get(i);
        result.push({
          number: i,
          isBusy: true,
          busyType: 'order',
          occupiedBy: occupied.doc._id.toString(),
        });
      } else if (reservationMap.has(i)) {
        const occupied = reservationMap.get(i);
        result.push({
          number: i,
          isBusy: true,
          busyType: 'reservation',
          occupiedBy: occupied.doc._id.toString(),
        });
      } else {
        result.push({ number: i, isBusy: false, busyType: null, occupiedBy: null });
      }
    }
    return result;
  },

  register: async ({ name, email, password, phone }: any) => {
    const v = validate(registerSchema, { name, email, password, phone });
    if (!v.success) throw new Error(v.errors.join(', '));
    const existing = await User.findOne({ email });
    if (existing) throw new Error('User already exists');
    const user = await User.create({ name, email, password, phone, role: 'customer' });
    const token = generateToken(user._id.toString());
    return { token, user: formatUser(user) };
  },

  login: async ({ email, password }: any) => {
    const v = validate(loginSchema, { email, password });
    if (!v.success) throw new Error(v.errors.join(', '));
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      throw new Error('Invalid email or password');
    const token = generateToken(user._id.toString());
    return { token, user: formatUser(user) };
  },

  createMenuItem: async ({ name, description, price, category, image }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(menuItemSchema, { name, description, price, category, image });
    if (!v.success) throw new Error(v.errors.join(', '));
    const item = await MenuItem.create(v.data);
    emitEvent('menu:changed');
    return item;
  },

  updateMenuItem: async ({ id, ...rest }: any, context?: any) => {
    await requireAdmin(context);
    const v = validate(menuItemSchema.partial(), rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const item = await MenuItem.findByIdAndUpdate(id, v.data, { new: true, runValidators: true });
    emitEvent('menu:changed');
    return item;
  },

  deleteMenuItem: async ({ id }: any, context?: any) => {
    await requireAdmin(context);
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) throw new Error('Menu item not found');
    emitEvent('menu:changed');
    return 'Menu item removed';
  },

  createOrder: async ({ items, tableNumber, paymentMethod }: any, context?: any) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const v = validate(createOrderSchema, { items, tableNumber, paymentMethod });
    if (!v.success) throw new Error(v.errors.join(', '));
    const menuItemIds = v.data.items.map((i) => i.menuItem);
    const existingItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    if (existingItems.length !== menuItemIds.length)
      throw new Error('One or more menu items not found');
    if (v.data.tableNumber) {
      const busyTable = await Order.findOne({
        tableNumber: v.data.tableNumber,
        status: { $in: ['pending', 'preparing'] },
      });
      if (busyTable) throw new Error('Table is busy');
    }
    const totalAmount = v.data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await Order.create({
      user: context.userId,
      items: v.data.items,
      totalAmount,
      tableNumber: v.data.tableNumber,
      paymentMethod: v.data.paymentMethod,
    });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return order;
  },

  updateOrder: async ({ id, ...rest }: any) => {
    const v = validate(updateOrderSchema, rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const updates: any = { ...v.data };
    if (v.data.items) {
      updates.totalAmount = v.data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
    if (v.data.tableNumber) {
      const busyTable = await Order.findOne({
        tableNumber: v.data.tableNumber,
        status: { $in: ['pending', 'preparing'] },
        _id: { $ne: id },
      });
      if (busyTable) throw new Error('Table is busy');
    }
    const order = await Order.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return order;
  },

  deleteOrder: async ({ id }: any) => {
    const order = await Order.findByIdAndDelete(id);
    if (!order) throw new Error('Order not found');
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return 'Order removed';
  },

  updateOrderStatus: async ({ id, status }: any) => {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    emitEvent('orders:changed');
    emitEvent('tables:changed');
    return order;
  },

  createReservation: async (
    { date, time, guests, tableNumber, specialRequests }: any,
    context?: any,
  ) => {
    if (!context?.userId) throw new Error('Not authenticated');
    const v = validate(reservationSchema, { date, time, guests, tableNumber, specialRequests });
    if (!v.success) throw new Error(v.errors.join(', '));
    const reservation = await Reservation.create({ user: context.userId, ...v.data });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return reservation;
  },

  updateReservation: async ({ id, ...rest }: any) => {
    const v = validate(reservationSchema.partial(), rest);
    if (!v.success) throw new Error(v.errors.join(', '));
    const reservation = await Reservation.findByIdAndUpdate(id, v.data, {
      new: true,
      runValidators: true,
    });
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return reservation;
  },

  deleteReservation: async ({ id }: any) => {
    const res = await Reservation.findByIdAndDelete(id);
    if (!res) throw new Error('Reservation not found');
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return 'Reservation removed';
  },

  cancelReservation: async ({ id }: any) => {
    const res = await Reservation.findById(id);
    if (!res) throw new Error('Reservation not found');
    res.status = 'cancelled';
    await res.save();
    emitEvent('reservations:changed');
    emitEvent('tables:changed');
    return res;
  },

  createCategory: async ({ name }: any) => {
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const cat = await Category.create(v.data);
    emitEvent('categories:changed');
    return cat;
  },
  updateCategory: async ({ id, name }: any) => {
    const v = validate(categorySchema, { name });
    if (!v.success) throw new Error(v.errors.join(', '));
    const cat = await Category.findByIdAndUpdate(id, v.data, { new: true, runValidators: true });
    emitEvent('categories:changed');
    return cat;
  },
  deleteCategory: async ({ id }: any) => {
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) throw new Error('Category not found');
    emitEvent('categories:changed');
    return 'Category removed';
  },

  createUserByAdmin: async ({ name, email, password, phone, role }: any) => {
    const v = validate(createUserSchema, { name, email, password, phone, role });
    if (!v.success) throw new Error(v.errors.join(', '));
    const existing = await User.findOne({ email: v.data.email });
    if (existing) throw new Error('User already exists');
    const validRoles = ['customer', 'staff', 'admin'];
    const userRole = validRoles.includes(v.data.role || '') ? v.data.role : 'customer';
    const user = await User.create({
      name: v.data.name,
      email: v.data.email,
      password: v.data.password,
      phone: v.data.phone,
      role: userRole,
    });
    emitEvent('users:changed');
    return formatUser(user);
  },

  updateUserRole: async ({ id, role }: any) => {
    const v = validate(updateUserRoleSchema, { role });
    if (!v.success) throw new Error(v.errors.join(', '));
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    user.role = v.data.role;
    await user.save();
    emitEvent('users:changed');
    return formatUser(user);
  },

  deleteUser: async ({ id }: any) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') throw new Error('Cannot delete admin user');
    await user.deleteOne();
    emitEvent('users:changed');
    return 'User removed';
  },

  updateRestaurantSettings: async (
    { name, logo, address, phone, email, tableCount }: any,
    context?: any,
  ) => {
    await requireAdmin(context);
    const v = validate(restaurantSettingsSchema, { name, logo, address, phone, email, tableCount });
    if (!v.success) throw new Error(v.errors.join(', '));
    let settings = await getOrCreateRestaurantSettings();
    if (v.data.name !== undefined) settings.name = v.data.name;
    if (v.data.logo !== undefined) settings.logo = v.data.logo;
    if (v.data.address !== undefined) settings.address = v.data.address;
    if (v.data.phone !== undefined) settings.phone = v.data.phone;
    if (v.data.email !== undefined) settings.email = v.data.email;
    if (v.data.tableCount !== undefined) {
      if (v.data.tableCount < 1) throw new Error('tableCount must be at least 1');
      settings.tableCount = v.data.tableCount;
    }
    await settings.save();
    emitEvent('settings:changed');
    emitEvent('tables:changed');
    return formatRestaurantSettings(settings);
  },
};

export { schema, root };
