import crypto from 'crypto';
import { getDB } from '../../config/rxdb.js';
import { withTransientRetry } from '../../retry.js';
import type { Citation } from '../types.js';

export interface KnowledgeDocumentRecord {
  id: string;
  title: string;
  sourceType: string;
  content: string;
  metadata: Record<string, unknown>;
  checksum: string;
  embeddingStatus: 'ready' | 'failed' | 'pending';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunkRecord {
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  embeddingModel: string;
}

export interface VectorSearchOptions {
  topK: number;
  minScore: number;
  maxChunks: number;
}

export interface VectorStore {
  listDocuments(): Promise<KnowledgeDocumentRecord[]>;
  getDocument(id: string): Promise<KnowledgeDocumentRecord | null>;
  upsertDocument(document: KnowledgeDocumentRecord): Promise<KnowledgeDocumentRecord>;
  replaceChunks(documentId: string, chunks: KnowledgeChunkRecord[]): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  search(queryEmbedding: number[], options: VectorSearchOptions): Promise<Citation[]>;
}

const toDocumentRecord = (json: any): KnowledgeDocumentRecord => {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = json.metadata ? JSON.parse(json.metadata) : {};
  } catch {
    metadata = {};
  }
  return {
    id: json._id,
    title: json.title ?? '',
    sourceType: json.sourceType ?? 'document',
    content: json.content ?? '',
    metadata,
    checksum: json.checksum ?? '',
    embeddingStatus: json.embeddingStatus ?? 'pending',
    chunkCount: json.chunkCount ?? 0,
    createdAt: json.createdAt ?? '',
    updatedAt: json.updatedAt ?? '',
  };
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const excerpt = (text: string, max = 700): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/** RxDB-backed chunk store with in-process cosine scoring. */
export class RxDbVectorStore implements VectorStore {
  private readonly dbProvider: () => Promise<any>;

  constructor(dbProvider: () => Promise<any> = getDB as unknown as () => Promise<any>) {
    this.dbProvider = dbProvider;
  }

  async listDocuments(): Promise<KnowledgeDocumentRecord[]> {
    const db = await this.dbProvider();
    if (!db.aiKnowledgeDocuments) return [];
    const docs = await db.aiKnowledgeDocuments.find().exec();
    return docs.map((doc: any) => toDocumentRecord(doc.toJSON()));
  }

  async getDocument(id: string): Promise<KnowledgeDocumentRecord | null> {
    const db = await this.dbProvider();
    if (!db.aiKnowledgeDocuments) return null;
    const doc = await db.aiKnowledgeDocuments.findOne(id).exec();
    return doc ? toDocumentRecord(doc.toJSON()) : null;
  }

  async upsertDocument(document: KnowledgeDocumentRecord): Promise<KnowledgeDocumentRecord> {
    const db = await this.dbProvider();
    const existing = await db.aiKnowledgeDocuments.findOne(document.id).exec();
    const row = {
      _id: document.id,
      title: document.title,
      sourceType: document.sourceType,
      content: document.content,
      metadata: JSON.stringify(document.metadata ?? {}),
      checksum: document.checksum,
      embeddingStatus: document.embeddingStatus,
      chunkCount: document.chunkCount,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
    if (existing) {
      await withTransientRetry(() => existing.update({ $set: row }), {
        operation: 'aiKnowledgeDocuments.update',
      });
    } else {
      await withTransientRetry(() => db.aiKnowledgeDocuments.insert(row), {
        operation: 'aiKnowledgeDocuments.insert',
      });
    }
    return document;
  }

  async replaceChunks(documentId: string, chunks: KnowledgeChunkRecord[]): Promise<void> {
    const db = await this.dbProvider();
    const existing = await db.aiKnowledgeChunks
      .find({ selector: { documentId } })
      .exec();
    for (const doc of existing) {
      await withTransientRetry(() => doc.remove(), { operation: 'aiKnowledgeChunks.remove' });
    }
    for (const chunk of chunks) {
      await withTransientRetry(
        () =>
          db.aiKnowledgeChunks.insert({
            _id: crypto.randomUUID(),
            documentId: chunk.documentId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            embedding: JSON.stringify(chunk.embedding),
            embeddingModel: chunk.embeddingModel,
            createdAt: new Date().toISOString(),
          }),
        { operation: 'aiKnowledgeChunks.insert' },
      );
    }
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.dbProvider();
    const chunks = await db.aiKnowledgeChunks.find({ selector: { documentId: id } }).exec();
    for (const chunk of chunks) {
      await withTransientRetry(() => chunk.remove(), { operation: 'aiKnowledgeChunks.remove' });
    }
    const doc = await db.aiKnowledgeDocuments.findOne(id).exec();
    if (doc) {
      await withTransientRetry(() => doc.remove(), { operation: 'aiKnowledgeDocuments.remove' });
    }
  }

  async search(queryEmbedding: number[], options: VectorSearchOptions): Promise<Citation[]> {
    const db = await this.dbProvider();
    if (!db.aiKnowledgeChunks || !db.aiKnowledgeDocuments) return [];

    const [chunkDocs, documentDocs] = await Promise.all([
      db.aiKnowledgeChunks.find().exec(),
      db.aiKnowledgeDocuments.find().exec(),
    ]);
    const documents = new Map<string, KnowledgeDocumentRecord>();
    for (const doc of documentDocs) {
      const record = toDocumentRecord(doc.toJSON());
      documents.set(record.id, record);
    }

    const scored: Citation[] = [];
    for (const doc of chunkDocs.slice(0, options.maxChunks)) {
      const chunk = doc.toJSON();
      const document = documents.get(chunk.documentId);
      if (!document || document.embeddingStatus !== 'ready') continue;
      let embedding: number[];
      try {
        embedding = JSON.parse(chunk.embedding ?? '[]');
      } catch {
        continue;
      }
      if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) continue;
      const score = cosineSimilarity(queryEmbedding, embedding);
      if (score < options.minScore) continue;
      scored.push({
        chunkId: chunk._id,
        documentId: chunk.documentId,
        title: document.title,
        sourceType: document.sourceType,
        chunkIndex: chunk.chunkIndex,
        excerpt: excerpt(chunk.content ?? ''),
        score: Number(score.toFixed(4)),
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, options.topK);
  }
}
