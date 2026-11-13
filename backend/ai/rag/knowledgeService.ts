import crypto from 'crypto';
import { AiError, AiErrorCodes, ragUnavailableError } from '../errors.js';
import type { Citation } from '../types.js';
import { chunkText, normalizeKnowledgeText } from './chunker.js';
import type {
  KnowledgeChunkRecord,
  KnowledgeDocumentRecord,
  VectorStore,
} from './vectorStore.js';

export interface KnowledgeRuntimeConfig {
  enabled: boolean;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  minScore: number;
  maxChunks: number;
  embeddingModel: string;
}

export interface IngestDocumentInput {
  id?: string;
  title: string;
  content: string;
  sourceType?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  document: KnowledgeDocumentRecord;
  warning?: string;
}

export interface KnowledgeServiceOptions {
  store: VectorStore;
  embed: (texts: string[], signal?: AbortSignal) => Promise<number[][]>;
  config: KnowledgeRuntimeConfig;
}

const checksum = (content: string): string =>
  crypto.createHash('sha256').update(content, 'utf8').digest('hex');

const EMBED_BATCH_SIZE = 32;

/**
 * Orchestrates document validation, chunking, embedding, persistence and
 * retrieval. Embedding failures leave the document visible to admins with a
 * `failed` status (never silently producing fake vectors).
 */
export class KnowledgeService {
  private readonly store: VectorStore;
  private readonly embed: KnowledgeServiceOptions['embed'];
  private readonly config: KnowledgeRuntimeConfig;

  constructor(options: KnowledgeServiceOptions) {
    this.store = options.store;
    this.embed = options.embed;
    this.config = options.config;
  }

  private assertEnabled(): void {
    if (!this.config.enabled) {
      throw ragUnavailableError('The knowledge base is not configured.');
    }
  }

  private async embedInBatches(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
      const batch = texts.slice(start, start + EMBED_BATCH_SIZE);
      const batchEmbeddings = await this.embed(batch, signal);
      if (batchEmbeddings.length !== batch.length) {
        throw new AiError(
          AiErrorCodes.PROVIDER_RESPONSE_INVALID,
          'The embedding provider returned an unexpected number of vectors.',
          502,
        );
      }
      embeddings.push(...batchEmbeddings);
    }
    return embeddings;
  }

  async ingest(input: IngestDocumentInput, signal?: AbortSignal): Promise<IngestResult> {
    this.assertEnabled();
    const content = normalizeKnowledgeText(input.content);
    if (!content) {
      throw new AiError(AiErrorCodes.VALIDATION_FAILED, 'Document content is required.', 400);
    }
    const title = input.title.trim();
    if (!title) {
      throw new AiError(AiErrorCodes.VALIDATION_FAILED, 'Document title is required.', 400);
    }

    const existing = input.id ? await this.store.getDocument(input.id) : null;
    const now = new Date().toISOString();
    const document: KnowledgeDocumentRecord = {
      id: input.id ?? crypto.randomUUID(),
      title,
      sourceType: input.sourceType ?? 'document',
      content,
      metadata: input.metadata ?? {},
      checksum: checksum(content),
      embeddingStatus: 'pending',
      chunkCount: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const chunks = chunkText(content, {
      chunkSize: this.config.chunkSize,
      overlap: this.config.chunkOverlap,
    });
    if (chunks.length === 0) {
      throw new AiError(AiErrorCodes.VALIDATION_FAILED, 'Document produced no readable text.', 400);
    }

    try {
      const embeddings = await this.embedInBatches(chunks, signal);
      const records: KnowledgeChunkRecord[] = chunks.map((chunk, index) => ({
        documentId: document.id,
        chunkIndex: index,
        content: chunk,
        embedding: embeddings[index],
        embeddingModel: this.config.embeddingModel,
      }));
      const ready: KnowledgeDocumentRecord = {
        ...document,
        embeddingStatus: 'ready',
        chunkCount: records.length,
      };
      await this.store.upsertDocument(ready);
      await this.store.replaceChunks(document.id, records);
      return { document: ready };
    } catch (error) {
      const failed: KnowledgeDocumentRecord = {
        ...document,
        embeddingStatus: 'failed',
        chunkCount: 0,
      };
      await this.store.upsertDocument(failed);
      await this.store.replaceChunks(document.id, []);
      const warning =
        error instanceof AiError
          ? error.message
          : 'The embedding provider was unavailable; the document was saved but not indexed.';
      return { document: failed, warning };
    }
  }

  async reindex(id: string, signal?: AbortSignal): Promise<IngestResult> {
    this.assertEnabled();
    const existing = await this.store.getDocument(id);
    if (!existing) {
      throw new AiError(AiErrorCodes.NOT_FOUND, 'Knowledge document not found.', 404);
    }
    return this.ingest(
      {
        id: existing.id,
        title: existing.title,
        content: existing.content,
        sourceType: existing.sourceType,
        metadata: existing.metadata,
      },
      signal,
    );
  }

  async delete(id: string): Promise<void> {
    const existing = await this.store.getDocument(id);
    if (!existing) {
      throw new AiError(AiErrorCodes.NOT_FOUND, 'Knowledge document not found.', 404);
    }
    await this.store.deleteDocument(id);
  }

  listDocuments(): Promise<KnowledgeDocumentRecord[]> {
    return this.store.listDocuments();
  }

  getDocument(id: string): Promise<KnowledgeDocumentRecord | null> {
    return this.store.getDocument(id);
  }

  async search(
    query: string,
    options: { topK?: number; minScore?: number } = {},
    signal?: AbortSignal,
  ): Promise<Citation[]> {
    this.assertEnabled();
    const trimmed = query.trim();
    if (!trimmed) {
      throw new AiError(AiErrorCodes.VALIDATION_FAILED, 'A knowledge search query is required.', 400);
    }
    if (trimmed.length > 500) {
      throw new AiError(AiErrorCodes.VALIDATION_FAILED, 'The knowledge query is too long.', 400);
    }
    let embedding: number[];
    try {
      [embedding] = await this.embed([trimmed], signal);
    } catch (error) {
      if (error instanceof AiError) throw error;
      throw ragUnavailableError();
    }
    if (!embedding || embedding.length === 0) throw ragUnavailableError();

    return this.store.search(embedding, {
      topK: options.topK ?? this.config.topK,
      minScore: options.minScore ?? this.config.minScore,
      maxChunks: this.config.maxChunks,
    });
  }
}
