import { getDB } from '../../config/rxdb.js';
import { authError, forbiddenError } from '../errors.js';

export const requireAuth = async (context: any) => {
  if (!context?.userId) throw authError();
  const db = await getDB();
  const userDoc = await db.users.findOne(context.userId).exec();
  if (!userDoc) throw authError();
  return userDoc.toJSON();
};

export const requireAdmin = async (context: any) => {
  const user = await requireAuth(context);
  if (user.role !== 'admin') throw forbiddenError('Not authorized, admin only');
  return user;
};

export const requireStaffOrAdmin = async (context: any) => {
  const user = await requireAuth(context);
  if (user.role !== 'admin' && user.role !== 'staff')
    throw forbiddenError('Not authorized, staff or admin only');
  return user;
};


