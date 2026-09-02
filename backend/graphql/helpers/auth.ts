import User from '../../models/User.js';

export const requireAuth = async (context: any) => {
  if (!context?.userId) throw new Error('Not authenticated');
  const user = await User.findById(context.userId);
  if (!user) throw new Error('Not authenticated');
  return user;
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
