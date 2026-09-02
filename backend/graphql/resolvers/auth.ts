import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { registerSchema, loginSchema, createUserSchema, updateUserRoleSchema, validate } from '../validation.js';
import { formatUser } from '../helpers/formatters.js';
import { emitEvent } from '../../socket.js';

function generateToken(id: string): string {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
}

export const authResolvers = {
  authMe: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    const user = await User.findById(context.userId).select('-password').lean();
    return formatUser(user);
  },

  authUsers: async () => {
    const users = await User.find({}).select('-password').lean();
    return users.map(formatUser);
  },

  authProfile: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    const user = await User.findById(context.userId).select('-password').lean();
    return formatUser(user);
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
    if (!user || !(await user.matchPassword(password))) throw new Error('Invalid email or password');
    const token = generateToken(user._id.toString());
    return { token, user: formatUser(user) };
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
};
