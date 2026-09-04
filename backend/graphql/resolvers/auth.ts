import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import bcrypt from 'bcryptjs';
import {
  registerSchema,
  loginSchema,
  createUserSchema,
  updateUserRoleSchema,
  validate,
} from '../validation.js';
import { formatUser } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

const genId = () => crypto.randomUUID();

function generateToken(id: string): string {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
}

export const authResolvers = {
  authMe: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    const db = await getDB();
    const userDoc = await db.users.findOne({ _id: context.userId }).exec();
    if (!userDoc) return null;
    const user = userDoc.toJSON();
    delete user.password;
    return formatUser(user);
  },

  authUsers: async () => {
    const db = await getDB();
    const docs = await db.users.find().exec();
    const users = docs.map((doc: any) => {
      const u = doc.toJSON();
      delete u.password;
      return formatUser(u);
    });
    return users;
  },

  authProfile: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    const db = await getDB();
    const userDoc = await db.users.findOne({ _id: context.userId }).exec();
    if (!userDoc) return null;
    const user = userDoc.toJSON();
    delete user.password;
    return formatUser(user);
  },

  register: async ({ name, email, password, phone }: any) => {
    const v = validate(registerSchema, { name, email, password, phone });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const existing = await db.users.findOne({ email }).exec();
    if (existing) throw new Error('User already exists');
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const userDoc = await db.users.insert({ _id: genId(), name, email, password: hashed, phone, role: 'customer' });
    const token = generateToken(userDoc._id as string);
    const user = userDoc.toJSON();
    delete user.password;
    return { token, user: formatUser(user) };
  },

  login: async ({ email, password }: any) => {
    const v = validate(loginSchema, { email, password });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const userDoc = await db.users.findOne({ email }).exec();
    if (!userDoc) throw new Error('Invalid email or password');
    const user = userDoc.toJSON();
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid email or password');
    const token = generateToken(userDoc._id as string);
    delete user.password;
    return { token, user: formatUser(user) };
  },

  createUserByAdmin: async ({ name, email, password, phone, role }: any) => {
    const v = validate(createUserSchema, { name, email, password, phone, role });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const existing = await db.users.findOne({ email: v.data.email }).exec();
    if (existing) throw new Error('User already exists');
    const validRoles = ['customer', 'staff', 'admin'];
    const userRole = validRoles.includes(v.data.role || '') ? v.data.role : 'customer';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(v.data.password, salt);
    const userDoc = await db.users.insert({
      _id: genId(),
      name: v.data.name,
      email: v.data.email,
      password: hashed,
      phone: v.data.phone,
      role: userRole,
    });
    emitEvent('users:changed');
    const user = userDoc.toJSON();
    delete user.password;
    return formatUser(user);
  },

  updateUserRole: async ({ id, role }: any) => {
    const v = validate(updateUserRoleSchema, { role });
    if (!v.success) throw new Error(v.errors.join(', '));
    const db = await getDB();
    const userDoc = await db.users.findOne({ _id: id }).exec();
    if (!userDoc) throw new Error('User not found');
    await userDoc.update({ $set: { role: v.data.role } });
    emitEvent('users:changed');
    const user = userDoc.toJSON();
    delete user.password;
    return formatUser(user);
  },

  deleteUser: async ({ id }: any) => {
    const db = await getDB();
    const userDoc = await db.users.findOne({ _id: id }).exec();
    if (!userDoc) throw new Error('User not found');
    const user = userDoc.toJSON();
    if (user.role === 'admin') throw new Error('Cannot delete admin user');
    await userDoc.remove();
    emitEvent('users:changed');
    return 'User removed';
  },
};
