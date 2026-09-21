import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import bcrypt from 'bcryptjs';
import {
  registerSchema,
  loginSchema,
  createUserSchema,
  updateUserRoleSchema,
  updateUserSchema,
  adminUpdatePasswordSchema,
  validate,
} from '../validation.js';
import { formatUser } from '../helpers/formatters.js';
import {
  authError,
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from '../errors.js';
import { emitEvent } from '../../sse.js';
import { requireAdmin, requireStaffOrAdmin } from '../helpers/auth.js';
import { recordActivity } from '../helpers/activityLog.js';

const genId = () => crypto.randomUUID();

function generateToken(id: string): string {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
}

export const authResolvers = {
  authMe: async (_args: any, context?: any) => {
    if (!context?.userId) return null;
    const db = await getDB();
    const userDoc = await db.users.findOne(context.userId).exec();
    if (!userDoc) return null;
    const user = userDoc.toJSON();
    delete user.password;
    return formatUser(user);
  },

  authUsers: async (_args: any, context?: any) => {
    // Staff-readable (not admin-only): staff need the full user list for the
    // orders/reservations user filter. No password is returned (deleted
    // before formatting); user mutations stay admin-only.
    await requireStaffOrAdmin(context);
    const db = await getDB();
    const docs = await db.users.find().exec();
    const users = docs.map((doc: any) => {
      const u = doc.toJSON();
      delete u.password;
      return formatUser(u);
    });
    return users;
  },

  register: async ({ name, email, password, phone }: any) => {
    const v = validate(registerSchema, { name, email, password, phone });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const existing = await db.users.findOne({ email }).exec();
    if (existing?.toJSON()) throw conflictError('User already exists');
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const userDoc = await db.users.insert({
      _id: genId(),
      name,
      email,
      password: hashed,
      phone,
      role: 'customer',
    });
    const token = generateToken(userDoc._id as string);
    const user = userDoc.toJSON();
    delete user.password;
    const formatted = formatUser(user);
    await recordActivity(
      undefined,
      {
        action: 'register',
        entity: 'auth',
        entityId: formatted?.id,
        summary: `${formatted?.name ?? email} registered`,
      },
      { actorId: formatted?.id, actorName: formatted?.name ?? email, actorRole: 'customer' },
    );
    return { token, user: formatted };
  },

  login: async ({ email, password }: any) => {
    const v = validate(loginSchema, { email, password });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const userDoc = await db.users.findOne({ selector: { email } }).exec();
    if (!userDoc || userDoc.length === 0) throw authError('Invalid email or password');
    const user = userDoc?.toJSON();
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw authError('Invalid email or password');
    const token = generateToken(user._id as string);
    delete user.password;
    const formatted = formatUser(user);
    await recordActivity(
      { userId: user._id },
      {
        action: 'login',
        entity: 'auth',
        entityId: formatted?.id,
        summary: `${formatted?.name ?? email} logged in`,
      },
    );
    return { token, user: formatted };
  },

  createUserByAdmin: async ({ name, email, password, phone, role }: any, context: any) => {
    await requireAdmin(context);
    const v = validate(createUserSchema, { name, email, password, phone, role });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const existing = await db.users.findOne({ selector: { email } }).exec();
    if (existing?.toJSON()) throw conflictError('User already exists');
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
    const user = userDoc.toJSON();
    delete user.password;
    const formattedUser = formatUser(user);
    emitEvent('users:changed', { user: formattedUser }, context.userId);
    await recordActivity(context, {
      action: 'create',
      entity: 'user',
      entityId: formattedUser?.id,
      summary: `User "${formattedUser?.name ?? email}" created with role "${formattedUser?.role}"`,
    });
    return formattedUser;
  },

  updateUserRole: async ({ id, role }: any, context: any) => {
    await requireAdmin(context);
    const v = validate(updateUserRoleSchema, { role });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const userDoc = await db.users.findOne(id).exec();
    if (!userDoc) throw notFoundError('User not found');
    await userDoc.update({ $set: { role: v.data.role } });
    const updated = await db.users.findOne(id).exec();
    const user = updated?.toJSON() || userDoc.toJSON();
    delete user.password;
    const formattedUser = formatUser(user);
    emitEvent('users:changed', { user: formattedUser }, context.userId);
    await recordActivity(context, {
      action: 'update',
      entity: 'user',
      entityId: id,
      summary: `User ${formattedUser?.name ?? id} role changed to "${formattedUser?.role}"`,
    });
    return formattedUser;
  },

  updateUser: async ({ id, name, email, phone, role }: any, context: any) => {
    await requireAdmin(context);
    const v = validate(updateUserSchema, { name, email, phone, role });
    if (!v.success) throw validationError(v.errors.join(', '));
    if (
      v.data.name === undefined &&
      v.data.email === undefined &&
      v.data.phone === undefined &&
      v.data.role === undefined
    ) {
      throw validationError('No fields to update');
    }
    const db = await getDB();
    const userDoc = await db.users.findOne(id).exec();
    if (!userDoc) throw notFoundError('User not found');
    const current = userDoc.toJSON();
    // Prevent an admin from demoting/deleting their own admin access via this path.
    if (context?.userId === id && v.data.role !== undefined && v.data.role !== 'admin') {
      throw forbiddenError('Cannot change your own role');
    }
    if (v.data.email !== undefined && v.data.email !== current.email) {
      const all = await db.users.find().exec();
      const clash = all.map((d: any) => d.toJSON()).find((u: any) => u.email === v.data.email);
      if (clash) throw conflictError('Email already in use');
    }
    const patch: Record<string, any> = {};
    if (v.data.name !== undefined) patch.name = v.data.name;
    if (v.data.email !== undefined) patch.email = v.data.email;
    if (v.data.phone !== undefined) patch.phone = v.data.phone;
    if (v.data.role !== undefined) patch.role = v.data.role;
    await userDoc.update({ $set: patch });
    const updated = await db.users.findOne(id).exec();
    const user = updated?.toJSON() || userDoc.toJSON();
    delete user.password;
    const formattedUser = formatUser(user);
    emitEvent('users:changed', { user: formattedUser }, context.userId);
    await recordActivity(context, {
      action: 'update',
      entity: 'user',
      entityId: id,
      summary: `User ${formattedUser?.name ?? id} updated`,
    });
    return formattedUser;
  },

  adminUpdateUserPassword: async ({ id, password }: any, context: any) => {
    await requireAdmin(context);
    const v = validate(adminUpdatePasswordSchema, { password });
    if (!v.success) throw validationError(v.errors.join(', '));
    const db = await getDB();
    const userDoc = await db.users.findOne(id).exec();
    if (!userDoc) throw notFoundError('User not found');
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(v.data.password, salt);
    await userDoc.update({ $set: { password: hashed } });
    const user = (await db.users.findOne(id).exec())?.toJSON() || userDoc.toJSON();
    emitEvent(
      'users:changed',
      { user: formatUser({ ...user, password: undefined }) },
      context.userId,
    );
    await recordActivity(context, {
      action: 'update',
      entity: 'user',
      entityId: id,
      summary: `Password reset for user "${user.name ?? user.email ?? id}"`,
    });
    return 'Password updated';
  },

  deleteUser: async ({ id }: any, context: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const userDoc = await db.users.findOne(id).exec();
    if (!userDoc) throw notFoundError('User not found');
    const user = userDoc.toJSON();
    if (user.role === 'admin') throw forbiddenError('Cannot delete admin user');
    await userDoc.remove();
    await db.users.cleanup(0);
    emitEvent('users:changed', { user: { id, deleted: true } }, context.userId);
    await recordActivity(context, {
      action: 'delete',
      entity: 'user',
      entityId: id,
      summary: `User "${user.name ?? user.email ?? id}" deleted`,
    });
    return 'User removed';
  },
};
