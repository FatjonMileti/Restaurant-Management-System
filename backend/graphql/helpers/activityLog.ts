import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { emitEvent } from '../../sse.js';

export interface ActivityInput {
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
}

const unwrap = (doc: any) => {
  if (!doc) return null;
  if (doc.toJSON && typeof doc.toJSON === 'function') {
    const json = doc.toJSON();
    if (json !== doc) return json;
  }
  return doc;
};

export const formatActivityLog = (doc: any) => {
  if (!doc) return null;
  const d = unwrap(doc);
  return {
    id: d._id ? d._id.toString() : d.id || '',
    actorId: d.actorId || null,
    actorName: d.actorName || null,
    actorRole: d.actorRole || null,
    action: d.action || '',
    entity: d.entity || '',
    entityId: d.entityId || null,
    summary: d.summary || '',
    createdAt: d.createdAt || null,
  };
};

const resolveActor = async (db: any, context?: any) => {
  if (!context?.userId) return { actorId: null, actorName: 'System', actorRole: null };
  try {
    const userDoc = await db.users.findOne(context.userId).exec();
    const u = userDoc ? unwrap(userDoc) : null;
    if (!u) return { actorId: context.userId, actorName: 'Unknown user', actorRole: null };
    return {
      actorId: u._id ? u._id.toString() : context.userId,
      actorName: u.name || u.email || 'Unknown user',
      actorRole: u.role || null,
    };
  } catch {
    return { actorId: context?.userId ?? null, actorName: 'Unknown user', actorRole: null };
  }
};

/**
 * Persist an activity entry and broadcast `logs:changed` over SSE.
 * Never throws — logging must not break the originating mutation.
 */
export const recordActivity = async (
  context: any,
  input: ActivityInput,
  actorOverride?: { actorId?: string | null; actorName?: string; actorRole?: string | null },
): Promise<void> => {
  try {
    const db = await getDB();
    if (!db.activityLogs) return;
    const actor = actorOverride ?? (await resolveActor(db, context));
    const entry = {
      _id: crypto.randomUUID(),
      actorId: actor.actorId ?? '',
      actorName: actor.actorName ?? 'System',
      actorRole: actor.actorRole ?? '',
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? '',
      summary: input.summary,
      createdAt: new Date().toISOString(),
    };
    const doc = await db.activityLogs.insert(entry);
    emitEvent('logs:changed', { activityLog: formatActivityLog(doc.toJSON()) }, context?.userId);
  } catch {
    // Activity logging is best-effort.
  }
};
