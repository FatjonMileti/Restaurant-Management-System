# AI Knowledge — Ingestion and RAG Flow

RAG means retrieval-augmented generation. In this project, approved restaurant knowledge is stored as text, split into chunks, embedded into vectors, and searched when the virtual waitress needs supporting information.

RAG is for relatively stable information such as restaurant policies or FAQs. It is not a replacement for live menu queries, reservation availability checks, or business validation.

## The two paths

### A. Ingestion (admin/setup path)

1. An admin submits or edits a knowledge document through the AI knowledge endpoints, or an operator runs the ingestion CLI.
2. `KnowledgeService.ingest()` normalizes and validates the document text.
3. `chunker.ts` splits the document into overlapping chunks.
4. The embedding function sends chunks to the configured embedding model in bounded batches.
5. `RxDbVectorStore` stores the document, chunk text, embedding vector, and embedding-model name in RxDB.
6. The document status becomes `ready`; if embedding fails, the document is visible with a failed status instead of fabricated vectors.

### B. Retrieval (customer question path)

1. The waitress agent asks the registered knowledge tool to search approved knowledge.
2. The knowledge tool passes the query to `KnowledgeService.search()`.
3. The service embeds the query using the configured embedding model.
4. `RxDbVectorStore.search()` compares the query vector with stored chunk vectors using cosine similarity.
5. Results below the configured minimum score are discarded; remaining matches are ranked and bounded.
6. The tool returns excerpts and citation metadata to the agent.
7. The agent may use the retrieved content to answer, and the response returns citation artifacts for the UI.

## Main files

| File | Responsibility |
|---|---|
| `backend/ai/rag/chunker.ts` | Normalizes and splits source text |
| `backend/ai/rag/knowledgeService.ts` | Ingestion, embeddings, search orchestration and document lifecycle |
| `backend/ai/rag/vectorStore.ts` | RxDB persistence and in-process cosine similarity search |
| `backend/ai/rag/seed.ts` | Optional initial approved knowledge seeding |
| `backend/ai/rag/ingestCli.ts` | Command-line ingestion entry point |
| `backend/ai/tools/knowledgeTool.ts` | Exposes knowledge search to the agent |
| `backend/ai/runtime.ts` | Enables RAG only when configuration and embeddings are available |
| `backend/ai/routes.ts` | Admin endpoints for listing, creating, updating, deleting and reindexing documents |

## Why both live tools and RAG exist

Use a live tool for facts that can change:

- current menu items and prices;
- whether an item is available;
- current table availability;
- current restaurant settings exposed by the backend.

Use RAG for approved descriptive content:

- restaurant FAQs;
- policies and service explanations;
- curated information that is not represented by a live database field.

If the app does not store a fact, neither RAG nor the LLM should invent it. For example, the current menu model does not provide structured allergen information, and the settings do not define opening hours.

## Important implementation details

- The vector store is backed by RxDB and performs cosine scoring in the backend process; it is not a dedicated vector database or approximate-nearest-neighbor index.
- Embedding vectors must have compatible dimensions. Ingestion and query embeddings should use the same configured embedding model.
- Similarity is a relevance signal, not proof that a chunk answers the question.
- Retrieved text is untrusted input. It must not be allowed to override system rules or grant permission to execute actions.
- Citations identify retrieved chunks/documents; they do not independently guarantee factual correctness.

## Troubleshooting

- No knowledge tool or citations: verify RAG is enabled and the knowledge tool is registered.
- Documents exist but are not retrievable: inspect their embedding status, model configuration, and chunk count.
- Embedding errors: verify embedding endpoint/model and provider response compatibility.
- Irrelevant results: inspect the source text, chunk size/overlap, minimum score, top-K, and embedding model.
- Knowledge does not include a new policy: re-ingest or reindex the document after changing it.

See [AI-DEBUGGING.md](./AI-DEBUGGING.md) for local verification steps.
