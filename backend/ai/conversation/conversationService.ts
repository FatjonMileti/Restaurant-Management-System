import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { AiError, AiErrorCodes } from '../errors.js';

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const toConversation = (json: any): ConversationRecord => ({
  id: json._id,
  userId: json.userId,
  title: json.title ?? '',
  status: json.status ?? 'active',
  createdAt: json.createdAt ?? '',
  updatedAt: json.updatedAt ?? '',
});

const toMessage = (json: any): ConversationMessage => ({
  id: json._id,
  role: json.role === 'assistant' ? 'assistant' : 'user',
  content: json.content ?? '',
  createdAt: json.createdAt ?? '',
});

export const createConversation = async (userId: string, firstMessage: string) => {
  const db = await getDB();
  const now = new Date().toISOString();
  const title = firstMessage.trim().slice(0, 80) || 'New conversation';
  const doc = await db.aiConversations.insert({
    _id: crypto.randomUUID(),
    userId,
    title,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return toConversation(doc.toJSON());
};

export const getConversationForUser = async (
  conversationId: string,
  userId: string,
): Promise<ConversationRecord | null> => {
  const db = await getDB();
  const doc = await db.aiConversations.findOne(conversationId).exec();
  if (!doc) return null;
  const conversation = toConversation(doc.toJSON());
  // Treat another user's conversation as not found rather than revealing it.
  if (conversation.userId !== userId) return null;
  return conversation;
};

export const appendConversationMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<ConversationMessage> => {
  const db = await getDB();
  const now = new Date().toISOString();
  const doc = await db.aiMessages.insert({
    _id: crypto.randomUUID(),
    conversationId,
    role,
    content: content.slice(0, 12000),
    createdAt: now,
  });
  const conversation = await db.aiConversations.findOne(conversationId).exec();
  if (conversation) {
    await conversation.update({ $set: { updatedAt: now } });
  }
  return toMessage(doc.toJSON());
};

/** Most recent messages, returned oldest-first for the provider. */
export const getRecentConversationMessages = async (
  conversationId: string,
  limit: number,
): Promise<ConversationMessage[]> => {
  const db = await getDB();
  const docs = await db.aiMessages
    .find({ selector: { conversationId } })
    .exec();
  return docs
    .map((doc: any): ConversationMessage => toMessage(doc.toJSON()))
    .sort((a: ConversationMessage, b: ConversationMessage) =>
      a.createdAt.localeCompare(b.createdAt),
    )
    .slice(-Math.max(1, limit));
};

export const getConversationMessages = async (
  conversationId: string,
  userId: string,
): Promise<ConversationMessage[]> => {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) {
    throw new AiError(AiErrorCodes.NOT_FOUND, 'Conversation not found.', 404);
  }
  const db = await getDB();
  const docs = await db.aiMessages
    .find({ selector: { conversationId } })
    .exec();
  return docs
    .map((doc: any): ConversationMessage => toMessage(doc.toJSON()))
    .sort((a: ConversationMessage, b: ConversationMessage) =>
      a.createdAt.localeCompare(b.createdAt),
    );
};
