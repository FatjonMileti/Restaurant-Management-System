import { AiError, AiErrorCodes } from '../ai/errors.js';
import { chunkText, normalizeKnowledgeText } from '../ai/rag/chunker.js';
import { KnowledgeService } from '../ai/rag/knowledgeService.js';
import {
  RxDbVectorStore,
  cosineSimilarity,
  type KnowledgeDocumentRecord,
  type VectorStore,
} from '../ai/rag/vectorStore.js';

const doc = (overrides: Partial<KnowledgeDocumentRecord> = {}): KnowledgeDocumentRecord => ({
  id: 'd1',
  title: 'Reservation policy',
  sourceType: 'policy',
  content: 'Reservations are held for 15 minutes.',
  metadata: {},
  checksum: 'abc',
  embeddingStatus: 'ready',
  chunkCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const fakeDb = (documents: any[], chunks: any[]) => ({
  aiKnowledgeDocuments: {
    find: () => ({ exec: async () => documents.map((item) => ({ toJSON: () => item })) }),
    findOne: (id: string) => ({
      exec: async () => {
        const found = documents.find((item) => item._id === id);
        return found ? { toJSON: () => found } : null;
      },
    }),
  },
  aiKnowledgeChunks: {
    find: (query?: any) => ({
      exec: async () =>
        chunks
          .filter((chunk) =>
            query?.selector?.documentId ? chunk.documentId === query.selector.documentId : true,
          )
          .map((item) => ({ toJSON: () => item })),
    }),
  },
});

const createStore = () => {
  const store = {
    listDocuments: jest.fn().mockResolvedValue([]),
    getDocument: jest.fn().mockResolvedValue(null),
    upsertDocument: jest.fn(async (document: KnowledgeDocumentRecord) => document),
    replaceChunks: jest.fn().mockResolvedValue(undefined),
    deleteDocument: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
  };
  return store;
};

const createService = (
  store: ReturnType<typeof createStore>,
  overrides: { embed?: jest.Mock; enabled?: boolean } = {},
) =>
  new KnowledgeService({
    store: store as unknown as VectorStore,
    embed:
      overrides.embed ??
      (jest.fn(async (texts: string[]) => texts.map(() => [1, 0])) as any),
    config: {
      enabled: overrides.enabled ?? true,
      chunkSize: 200,
      chunkOverlap: 40,
      topK: 3,
      minScore: 0.5,
      maxChunks: 100,
      embeddingModel: 'embed-test',
    },
  });

describe('knowledge chunking', () => {
  it('normalizes whitespace and creates bounded, non-empty chunks', () => {
    const raw = `# Policy\r\n\r\nReservations are held for fifteen minutes. Guests should arrive on time.\n\n\nLarge parties need a phone confirmation. Please call ahead for groups over eight.`;
    expect(normalizeKnowledgeText(raw)).not.toContain('\r');
    expect(normalizeKnowledgeText(raw)).not.toContain('\n\n\n');

    const chunks = chunkText(raw, { chunkSize: 110, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0);
      expect(chunk.length).toBeLessThanOrEqual(110);
    }
    expect(chunks.join(' ')).toContain('Reservations are held');
    expect(chunks.join(' ')).toContain('groups over eight');
  });

  it('returns no chunks for empty text', () => {
    expect(chunkText('   \n\n ', { chunkSize: 200, overlap: 10 })).toEqual([]);
  });
});

describe('cosine vector store', () => {
  it('computes cosine similarity and ignores mismatched vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });

  it('filters by document status and score, sorts, and limits results', async () => {
    const documents = [
      { _id: 'ready', title: 'Ready doc', sourceType: 'policy', embeddingStatus: 'ready' },
      { _id: 'failed', title: 'Failed doc', sourceType: 'policy', embeddingStatus: 'failed' },
    ];
    const chunks = [
      {
        _id: 'low',
        documentId: 'ready',
        chunkIndex: 1,
        content: 'less relevant',
        embedding: JSON.stringify([0.2, 1]),
      },
      {
        _id: 'high',
        documentId: 'ready',
        chunkIndex: 0,
        content: 'most relevant',
        embedding: JSON.stringify([1, 0]),
      },
      {
        _id: 'failed-chunk',
        documentId: 'failed',
        chunkIndex: 0,
        content: 'ignored',
        embedding: JSON.stringify([1, 0]),
      },
    ];
    const store = new RxDbVectorStore(async () => fakeDb(documents, chunks));

    const results = await store.search([1, 0], { topK: 1, minScore: 0.5, maxChunks: 100 });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      chunkId: 'high',
      documentId: 'ready',
      title: 'Ready doc',
      sourceType: 'policy',
      excerpt: 'most relevant',
    });
    expect(results[0].score).toBe(1);
  });
});

describe('knowledge service', () => {
  it('chunks, embeds and persists a ready document', async () => {
    const store = createStore();
    const service = createService(store);
    const result = await service.ingest({
      id: 'doc-1',
      title: 'Service policy',
      content: 'We hold reservations for fifteen minutes. Please arrive on time.',
      sourceType: 'policy',
      metadata: { filename: 'policy.md' },
    });

    expect(result.document).toMatchObject({
      id: 'doc-1',
      title: 'Service policy',
      sourceType: 'policy',
      embeddingStatus: 'ready',
      metadata: { filename: 'policy.md' },
    });
    expect(result.document.chunkCount).toBeGreaterThan(0);
    expect(store.upsertDocument).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1', embeddingStatus: 'ready' }),
    );
    expect(store.replaceChunks).toHaveBeenCalledWith(
      'doc-1',
      expect.arrayContaining([
        expect.objectContaining({ documentId: 'doc-1', embeddingModel: 'embed-test', embedding: [1, 0] }),
      ]),
    );
  });

  it('keeps a failed document visible without writing fake vectors', async () => {
    const store = createStore();
    const embed = jest.fn().mockRejectedValue(new Error('provider down'));
    const service = createService(store, { embed });
    const result = await service.ingest({
      id: 'doc-2',
      title: 'Unavailable',
      content: 'Some policy content that is long enough to chunk.',
    });

    expect(result.document.embeddingStatus).toBe('failed');
    expect(result.document.chunkCount).toBe(0);
    expect(result.warning).toMatch(/unavailable|not indexed/i);
    expect(store.replaceChunks).toHaveBeenCalledWith('doc-2', []);
  });

  it('rejects empty documents and unavailable configuration', async () => {
    const store = createStore();
    await expect(createService(store).ingest({ title: 'Empty', content: '   ' })).rejects.toMatchObject({
      code: AiErrorCodes.VALIDATION_FAILED,
    });
    await expect(
      createService(store, { enabled: false }).search('policy'),
    ).rejects.toMatchObject({ code: AiErrorCodes.RAG_UNAVAILABLE });
  });

  it('embeds queries and returns cited passages from the store', async () => {
    const store = createStore();
    const citation = {
      chunkId: 'c1',
      documentId: 'd1',
      title: 'Policy',
      sourceType: 'policy',
      chunkIndex: 0,
      excerpt: 'held for 15 minutes',
      score: 0.9,
    };
    store.search.mockResolvedValue([citation]);
    const embed = jest.fn().mockResolvedValue([[1, 0]]);
    const service = createService(store, { embed });

    await expect(service.search(' hold time ', { topK: 2, minScore: 0.3 })).resolves.toEqual([citation]);
    expect(embed).toHaveBeenCalledWith(['hold time'], undefined);
    expect(store.search).toHaveBeenCalledWith([1, 0], { topK: 2, minScore: 0.3, maxChunks: 100 });
  });

  it('reports missing documents for reindex and delete', async () => {
    const store = createStore();
    const service = createService(store);
    await expect(service.reindex('missing')).rejects.toMatchObject({ code: AiErrorCodes.NOT_FOUND });
    await expect(service.delete('missing')).rejects.toMatchObject({ code: AiErrorCodes.NOT_FOUND });
  });

  it('marks expired ingestion errors as typed AI errors', async () => {
    const store = createStore();
    const embed = jest.fn().mockRejectedValue(new AiError(AiErrorCodes.PROVIDER_TIMEOUT, 'slow', 504));
    const result = await createService(store, { embed }).ingest({
      title: 'Slow',
      content: 'This content will fail embedding.',
    });
    expect(result.document.embeddingStatus).toBe('failed');
    expect(result.warning).toBe('slow');
  });
});
