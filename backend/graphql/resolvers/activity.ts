import { getDB } from '../../config/rxdb.js';
import { formatActivityLog } from '../helpers/activityLog.js';
import { requireAdmin } from '../helpers/auth.js';
import { emitEvent } from '../../sse.js';

const toNumber = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

export const activityResolvers = {
  activityLogs: async ({ entity, action, search, limit, offset }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const docs = await db.activityLogs.find().sort({ createdAt: -1 }).exec();
    let rows = docs.map((doc: any) => formatActivityLog(doc.toJSON()));
    if (entity) rows = rows.filter((r: any) => r.entity === entity);
    if (action) rows = rows.filter((r: any) => r.action === action);
    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter((r: any) =>
        `${r.summary} ${r.actorName} ${r.entity} ${r.action}`.toLowerCase().includes(q),
      );
    }
    const start = toNumber(offset, 0);
    const pageSize =
      limit === undefined || limit === null ? rows.length : toNumber(limit, rows.length);
    return rows.slice(start, start + pageSize);
  },

  activityLogCount: async ({ entity, action, search }: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const docs = await db.activityLogs.find().exec();
    let rows = docs.map((doc: any) => formatActivityLog(doc.toJSON()));
    if (entity) rows = rows.filter((r: any) => r.entity === entity);
    if (action) rows = rows.filter((r: any) => r.action === action);
    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter((r: any) =>
        `${r.summary} ${r.actorName} ${r.entity} ${r.action}`.toLowerCase().includes(q),
      );
    }
    return rows.length;
  },

  clearActivityLogs: async (_args: any, context?: any) => {
    await requireAdmin(context);
    const db = await getDB();
    const docs = await db.activityLogs.find().exec();
    await Promise.all(docs.map((doc: any) => doc.remove()));
    await db.activityLogs.cleanup(0);
    emitEvent('logs:changed', { activityLog: null }, context?.userId);
    return 'Activity logs cleared';
  },
};
