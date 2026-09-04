import { getDB } from '../../config/rxdb.js';

export const requireAuth = async (context: any) => {
  if (!context?.userId) throw new Error('Not authenticated');
  const db = await getDB();
  const userDoc = await db.users.findOne({ _id: context.userId }).exec();
  if (!userDoc) throw new Error('Not authenticated');
  return userDoc.toJSON();
};

export const requireAdmin = async (context: any) => {
  const user = await requireAuth(context);
  if (user.role !== 'admin') throw new Error('Not authorized, admin only');
  return user;
};

export const requireStaffOrAdmin = async (context: any) => {
  const user = await requireAuth(context);
  if (user.role !== 'admin' && user.role !== 'staff')
    throw new Error('Not authorized, staff or admin only');
  return user;
};
