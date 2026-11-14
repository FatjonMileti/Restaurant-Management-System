import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/rxdb.js';
import { setRequestUserId } from '../requestContext.js';
import { AiErrorCodes } from '../ai/errors.js';
import type { AiUser } from '../ai/types.js';

const sendError = (res: Response, status: number, code: string, message: string) => {
  res.status(status).json({ error: { code, message } });
};

const loadRequestUser = async (req: Request): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) return;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return;

  let userId: string | undefined;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id?: string };
    userId = typeof decoded?.id === 'string' ? decoded.id : undefined;
  } catch {
    return;
  }
  if (!userId) return;

  const db = await getDB();
  const doc = await db.users.findOne(userId).exec();
  if (!doc) return;
  const user = doc.toJSON();
  if (!user?._id) return;

  req.user = {
    _id: user._id.toString(),
    name: user.name ?? '',
    email: user.email ?? '',
    role: user.role ?? 'customer',
    phone: user.phone ?? undefined,
  };
  setRequestUserId(req.user._id);
};

/** Populate req.user when a valid Bearer token is present; never rejects. */
export const optionalAiAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    await loadRequestUser(req);
    next();
  } catch {
    // Authentication is optional here; downstream handlers decide whether it
    // is required. A database failure is reported by those handlers.
    next();
  }
};

export const requireAiAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    sendError(res, 401, AiErrorCodes.UNAUTHENTICATED, 'Please log in to use this feature.');
    return;
  }
  next();
};

/** The waiter interpreter is a staff tool, not a customer chat surface. */
export const requireAiWaiter: RequestHandler = (req, res, next) => {
  if (!req.user) {
    sendError(res, 401, AiErrorCodes.UNAUTHENTICATED, 'Please log in to use this feature.');
    return;
  }
  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    sendError(res, 403, AiErrorCodes.FORBIDDEN, 'Only restaurant staff can use the interpreter.');
    return;
  }
  next();
};

export const requireAiAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) {
    sendError(res, 401, AiErrorCodes.UNAUTHENTICATED, 'Please log in to use this feature.');
    return;
  }
  if (req.user.role !== 'admin') {
    sendError(res, 403, AiErrorCodes.FORBIDDEN, 'Only restaurant admins can manage knowledge.');
    return;
  }
  next();
};

export const toAiUser = (req: Request): AiUser => {
  const user = req.user as Express.Request['user'];
  return {
    id: user?._id ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: (user?.role as AiUser['role']) ?? 'customer',
    phone: user?.phone,
  };
};
