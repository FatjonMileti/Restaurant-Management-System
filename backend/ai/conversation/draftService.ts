import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { AiError, AiErrorCodes } from '../errors.js';

export type DraftKind = 'order' | 'reservation';
export type DraftStatus = 'pending' | 'processing' | 'completed' | 'expired' | 'failed';

export interface DraftRecord {
  id: string;
  kind: DraftKind;
  userId: string;
  status: DraftStatus;
  payload: any;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  result?: any;
}

const toDraft = (json: any): DraftRecord => {
  let payload: any = {};
  let result: any;
  try {
    payload = json.payload ? JSON.parse(json.payload) : {};
  } catch {
    payload = {};
  }
  try {
    result = json.result ? JSON.parse(json.result) : undefined;
  } catch {
    result = undefined;
  }
  return {
    id: json._id,
    kind: json.kind === 'reservation' ? 'reservation' : 'order',
    userId: json.userId,
    status: json.status ?? 'pending',
    payload,
    expiresAt: json.expiresAt ?? '',
    createdAt: json.createdAt ?? '',
    updatedAt: json.updatedAt ?? '',
    completedAt: json.completedAt || undefined,
    result,
  };
};

// Single-process lock; the app runs one backend node against SQLite. A
// deterministic order/reservation id provides the durable idempotency layer.
const locks = new Map<string, Promise<unknown>>();

export const withDraftLock = async <T>(draftId: string, work: () => Promise<T>): Promise<T> => {
  if (locks.has(draftId)) {
    throw new AiError(
      AiErrorCodes.DRAFT_NOT_PENDING,
      'This draft is already being confirmed. Please wait a moment.',
      409,
    );
  }
  const promise = work();
  locks.set(draftId, promise);
  try {
    return await promise;
  } finally {
    locks.delete(draftId);
  }
};

export const clearDraftLocks = (): void => locks.clear();

export const createDraft = async (input: {
  kind: DraftKind;
  userId: string;
  payload: unknown;
  ttlMs: number;
}): Promise<DraftRecord> => {
  const db = await getDB();
  const now = new Date();
  const id = crypto.randomUUID();
  const record = {
    _id: id,
    kind: input.kind,
    userId: input.userId,
    status: 'pending',
    payload: JSON.stringify(input.payload),
    confirmationHash: crypto
      .createHash('sha256')
      .update(`${id}:${input.userId}`)
      .digest('hex'),
    idempotencyKey: `ai-${id}`,
    expiresAt: new Date(now.getTime() + input.ttlMs).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const doc = await db.aiDrafts.insert(record);
  return toDraft(doc.toJSON());
};

export const getDraftForUser = async (draftId: string, userId: string): Promise<DraftRecord> => {
  const db = await getDB();
  const doc = await db.aiDrafts.findOne(draftId).exec();
  if (!doc) throw new AiError(AiErrorCodes.NOT_FOUND, 'Draft not found.', 404);
  const draft = toDraft(doc.toJSON());
  if (draft.userId !== userId) {
    throw new AiError(AiErrorCodes.NOT_FOUND, 'Draft not found.', 404);
  }
  return draft;
};

export const markDraftStatus = async (
  draftId: string,
  status: DraftStatus,
  extra: { result?: unknown; completedAt?: string } = {},
): Promise<DraftRecord> => {
  const db = await getDB();
  const doc = await db.aiDrafts.findOne(draftId).exec();
  if (!doc) throw new AiError(AiErrorCodes.NOT_FOUND, 'Draft not found.', 404);
  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (extra.result !== undefined) updates.result = JSON.stringify(extra.result);
  if (extra.completedAt !== undefined) updates.completedAt = extra.completedAt;
  await doc.update({ $set: updates });
  const updated = await db.aiDrafts.findOne(draftId).exec();
  return toDraft(updated?.toJSON() ?? doc.toJSON());
};

export const isDraftExpired = (draft: DraftRecord, now: Date = new Date()): boolean => {
  const expiry = new Date(draft.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry <= now.getTime();
};

/**
 * Load and validate a draft for confirmation. Expired drafts are marked so a
 * subsequent click cannot perform the write.
 */
export const loadConfirmableDraft = async (
  draftId: string,
  userId: string,
): Promise<DraftRecord> => {
  const draft = await getDraftForUser(draftId, userId);
  if (draft.status === 'completed' && draft.result) return draft;
  if (draft.status === 'processing') {
    throw new AiError(
      AiErrorCodes.DRAFT_NOT_PENDING,
      'This draft is already being confirmed. Please wait a moment.',
      409,
    );
  }
  if (draft.status !== 'pending') {
    throw new AiError(AiErrorCodes.DRAFT_NOT_PENDING, 'This draft can no longer be confirmed.', 409);
  }
  if (isDraftExpired(draft)) {
    await markDraftStatus(draft.id, 'expired');
    throw new AiError(
      AiErrorCodes.DRAFT_EXPIRED,
      'This draft has expired. Please ask the assistant to prepare a new one.',
      410,
    );
  }
  return draft;
};
