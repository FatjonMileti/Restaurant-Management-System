# AI Virtual Waitress — Implementation Plan

Branch: `feature/ai-virtual-waitress` (created from `feature/rxdb-migration`)

This plan is based on the repository as it exists on this branch, not on the stale
parts of `README.md`. Tasks are checked off as they are implemented.

## 1. Objectives and scope

Build a customer-facing AI virtual waitress integrated into the existing
restaurant platform that can:

- Answer restaurant questions from approved knowledge (RAG) with citations.
- Read real menu, settings, reservation availability, and knowledge data through
  validated backend tools.
- Hold a bounded multi-turn conversation using an OpenAI-compatible LLM.
- Prepare server-validated order and reservation drafts.
- Perform order submission and reservation creation only after an explicit
  customer action outside the LLM tool loop, with backend revalidation,
  authorization, expiry, and idempotency.
- Help human waiters communicate with customers in different languages through
  a dedicated two-way interpreter mode at `/interpreter`, with text translation
  as the core workflow and optional browser speech support.

Out of scope unless already supported safely by the repository:

- Payments (the app only stores a `cash`/`card` label; no payment integration).
- Customer registration UI (route is commented out; backend registration exists).
- Opening-hours enforcement (the repository stores no opening hours).
- Table capacity enforcement (the repository stores no per-table capacity).
- Dietary/allergen classification (menu items have no such metadata).
- Separate vector database / ANN infrastructure (not justified for this data
  volume; implement an encapsulated in-process cosine store over RxDB text
  chunks, with a documented upgrade path).

## 2. Repository findings

### Verified architecture

- Backend: Node.js 20 + Express 4 + TypeScript, `moduleResolution: node16`
  (relative imports need `.js`). Active API is GraphQL at `POST /graphql` via
  `express-graphql`; REST route files are not mounted.
- Persistence: RxDB 17 + `@basepurpose/rxdb-sqlite`. Collections are declared in
  `backend/config/rxdb.ts`: `users`, `menuItems`, `categories`, `orders`,
  `reservations`, `settings`, `activityLogs`. Optional MongoDB replication is
  controlled by `MONGODB_URI`.
- Auth: JWT Bearer verified in `backend/server.ts` for GraphQL; `context.userId`
  is loaded by `requireAuth`/`requireStaffOrAdmin`/`requireAdmin`. Roles:
  `customer`, `staff`, `admin`.
- Orders: `createOrder` requires authentication, requires a table number, rejects
  a busy table, trusts client-supplied item names/prices, and computes the total
  from those client values.
- Reservations: `createReservation` is **staff/admin only** and does not check
  availability when writing. `tables` treats confirmed reservations as occupying
  a table for the whole current day; active orders (`pending`, `preparing`,
  `ready`) also occupy tables. There is no table-capacity or opening-hours data.
- Settings: name, logo, address, phone, email, `tableCount`, `updatedAt`. No
  public/internal split is encoded beyond read access: the settings query is
  public, mutations are admin-only.
- SSE: `GET /events/:userId` with live events (`menu:changed`, `orders:changed`,
  `reservations:changed`, `tables:changed`, etc.). AI actions will emit the same
  events.
- Frontend: React 18 + CRA + TypeScript, React Router 6, TanStack Query 5,
  Zustand auth/cart stores, MUI + Tailwind, `graphql-request`.
- Frontend routes: `/` and `/menu` are public; `/orders`, `/reservations`,
  `/tables` are login-protected but `ProtectedRoute` sends customers back to `/`
  unless they are staff/admin. Therefore the existing UI has no customer order
  or reservation screens. The AI feature will add a customer route, but final
  writes will remain backend-authorized.
- Tests: backend Jest + ts-jest ESM, roots `tests/` and `graphql/`; frontend
  react-scripts Jest + Testing Library. Existing suites mock `getDB` and `sse`.
- No installed vector-database, LLM SDK, or rate-limit package. Native `fetch`
  is available in the supported Node runtime, and `zod` is already a dependency.
- The working tree had pre-existing mode-only changes on
  `backend/package.json`, `frontend/package.json`, `frontend/public/index.html`,
  and their lockfiles. They are preserved and not reverted.

### Constraints discovered

- `min/max` filters and `$in` are not generally supported by the SQLite adapter;
  existing code fetches bounded collections and filters in JS where needed.
- RxDB collection schema changes require version bumps and migration strategies;
  adding **new** collections does not require changing existing schemas.
- Menu data has no dietary, allergen, ingredient, capacity, or opening-hours
  fields. The AI must explicitly say this information is unavailable.
- Existing reservation creation is a staff action. Customer reservation creation
  will be a new, narrowly scoped AI action that stores the authenticated user's
  id, uses existing reservation validation/persistence, and never grants staff
  capabilities.
- The LLM provider cannot be contacted in this environment without credentials.
  Integration is implemented behind an interface with mocked tests and
  documented configuration.

## 3. Proposed architecture and data flow

```
React /assistant
  -> POST /api/ai/chat (optional JWT, rate limited, size/time bounded)
     -> load bounded conversation history
     -> WaitressAgent (max iterations)
        -> OpenAI-compatible provider (tool calling)
        -> ToolRegistry (zod validation, role checks, timeouts)
           -> read-only tools: menu, restaurant info, availability, RAG
           -> draft tools: prepare_order_draft / prepare_reservation_draft
        -> structured artifacts (menu cards, citations, draft, availability)
     -> persist user + assistant messages (authenticated)
     -> JSON response with tool trace, artifacts, suggestions
  -> customer clicks Confirm on a draft (explicit UI action)
     -> POST /api/ai/actions/confirm { draftId }
        -> auth + ownership + expiry + status lock
        -> revalidate menu prices/availability/business rules
        -> create order/reservation through shared services with deterministic id
        -> emit existing SSE events and activity log
```

The LLM never receives a finalize/confirm tool. Retrieved documents and customer
messages are treated as untrusted data. Tools only access allow-listed services,
never arbitrary SQL/RxDB documents, shell, code, or HTTP.

### Multilingual waiter interpreter

The dedicated staff-facing interpreter is implemented in Phase 10. It is separate
from the customer-facing chat agent, uses a translation-specific provider with no
business tools, and does not persist translations. Browser speech recognition and
speech synthesis are optional and depend on browser support. See
`docs/AI-INTERPRETER-FLOW.md` for the code path and limitations.

### New backend modules

```
backend/ai/
  config.ts               environment validation, no secrets in logs
  errors.ts               typed AI errors -> HTTP mapping
  types.ts                provider/tool/agent contracts
  provider.ts             OpenAI-compatible chat + embeddings
  prompts.ts              system prompt with live date/time/timezone
  agent.ts                bounded tool-calling loop
  toolRegistry.ts         registration, access control, zod dispatch, timeouts
  tools/                  menu, restaurant, availability, knowledge, drafts
  rag/                    chunking, embeddings, RxDB vector store, ingestion
  conversation/           conversation history, draft lifecycle/locks
  actions/                confirm order/reservation with revalidation
  routes.ts               /api/ai Express router
  middleware.ts           optional/required JWT auth for AI routes
  rateLimit.ts            small in-memory limiter (no new dependency)
  init.ts                 startup validation + optional knowledge seeding
backend/services/
  orderService.ts         shared table-busy + server-priced order creation
  reservationService.ts   shared reservation persistence for AI customer flow
  availabilityService.ts  date/time-zone-aware table availability
backend/knowledge/        approved, customer-facing Markdown documents
```

### New RxDB collections

`aiConversations`, `aiMessages`, `aiKnowledgeDocuments`, `aiKnowledgeChunks`,
`aiDrafts`. Embeddings are stored as JSON strings in chunk documents so the
existing SQLite adapter does not need a vector extension. Retrieval loads a
bounded chunk set and computes cosine similarity in process. The vector store is
behind an interface so a dedicated store can replace it later.

## 4. Phases and tasks

### Phase 0 — Repository inspection, branch preparation, planning

- [x] 0.1 Inspect branch, working tree, uncommitted changes, recent history.
- [x] 0.2 Preserve existing uncommitted changes.
- [x] 0.3 Create `feature/ai-virtual-waitress` from `feature/rxdb-migration`.
- [x] 0.4 Read README, manifests, TypeScript config, GraphQL schema/resolvers,
      RxDB config, auth helpers, frontend routing/state/API, SSE, tests.
- [x] 0.5 Verify actual business logic for menu, orders, reservations, settings,
      and customer/staff authorization.
- [x] 0.6 Check dependency versions and conventions before selecting libraries.
- [x] 0.7 Create this plan before application changes.
- Completion criteria: branch exists, plan accurately reflects the codebase,
      unrelated changes are intact.

### Phase 1 — AI service foundation and configuration

- [x] 1.1 Add typed AI config with zod validation and safe defaults.
- [x] 1.2 Add provider abstraction and OpenAI-compatible chat/embeddings client.
- [x] 1.3 Support hosted or local (Ollama-compatible `/v1`) endpoints.
- [x] 1.4 Add request timeouts, abort signals, bounded response parsing.
- [x] 1.5 Add typed errors and HTTP status mapping; never leak secrets/stacks.
- [x] 1.6 Add tool registry with zod argument validation, role authorization,
      execution timeout, bounded output, and unknown-tool rejection.
- [x] 1.7 Add startup validation and `/api/ai/health` without secret exposure.
- Completion criteria: provider/tooling unit tests pass with mocked fetch; config
      failures produce clear operator-facing errors and 503s, not crashes.

### Phase 2 — Read-only restaurant tools

- [x] 2.1 `search_menu` with validated bounded filters and stable ids/prices.
- [x] 2.2 `get_menu_item_details` returning only stored fields.
- [x] 2.3 `get_restaurant_information` returning public settings only.
- [x] 2.4 `check_reservation_availability` using table count, active orders,
      confirmed reservations, restaurant time zone, and future-date validation.
- [x] 2.5 `search_restaurant_knowledge` backed by RAG with source metadata.
- [x] 2.6 Enforce consistent errors, limits, and no direct RxDB access by model.
- [x] 2.7 Explicitly report missing dietary/opening-hours/capacity metadata.
- Completion criteria: tools are registered, validated, role-aware, and covered
      by tests using mocked persistence.

### Phase 3 — RAG ingestion, embeddings, retrieval, citations

- [x] 3.1 Add RxDB document/chunk collections (new collections only).
- [x] 3.2 Configurable sentence-aware chunking with overlap.
- [x] 3.3 Embedding generation through the provider abstraction.
- [x] 3.4 Persistent ingestion with checksums, updates, deletion, re-indexing.
- [x] 3.5 Cosine-similarity retrieval with top-K and minimum score.
- [x] 3.6 Citation labels and source metadata in tool results.
- [x] 3.7 Graceful failure when embeddings/retrieval are unavailable.
- [x] 3.8 Admin-only document management endpoints.
- [x] 3.9 Built-in verified knowledge documents and ingestion CLI.
- [x] 3.10 Tests for chunking, retrieval, thresholds, citations, failures.
- Completion criteria: no invented knowledge, source metadata survives ingestion,
      empty/unavailable knowledge is reported honestly.

### Phase 4 — Tool-calling agent and conversation handling

- [x] 4.1 System prompt with live restaurant/time-zone context and safety rules.
- [x] 4.2 Bounded tool-calling loop with max iterations/tool calls.
- [x] 4.3 Tool result truncation and untrusted-data labeling.
- [x] 4.4 Conversation persistence for authenticated users and bounded history.
- [x] 4.5 Clarification behavior and unsupported-question handling.
- [x] 4.6 Structured artifacts: menu cards, citations, availability, drafts.
- [x] 4.7 Tests for loops, max iterations, malformed arguments, provider errors.
- Completion criteria: agent can only dispatch registered tools, produces
      grounded answers, and fails safely.

### Phase 5 — Customer-facing React chat interface

- [x] 5.1 Add `/assistant` route and navigation entry.
- [x] 5.2 Responsive message history, composer, loading/tool states.
- [x] 5.3 Menu item cards, citations, follow-up suggestions, error/retry.
- [x] 5.4 Order/reservation draft review and explicit confirmation controls.
- [x] 5.5 Accessibility: labels, keyboard send, focus management, live regions.
- [x] 5.6 Conversation restore for authenticated users.
- [x] 5.7 Tests for loading, error, confirmation, accessibility.
- Completion criteria: UI uses real API data, never displays success before the
      backend confirms, and never receives provider secrets.

### Phase 6 — Safe order and reservation actions

- [x] 6.1 Extract/reuse shared order creation and table-busy logic.
- [x] 6.2 Server-priced order drafts from menu ids + quantities.
- [x] 6.3 Revalidate availability, table occupancy, and current prices on
      confirm; reject if the reviewed price/item snapshot changed.
- [x] 6.4 Customer reservation drafts using authenticated identity/contact data.
- [x] 6.5 Explicit confirmation endpoint outside the LLM tool registry.
- [x] 6.6 Draft expiry, ownership checks, in-process lock, deterministic ids.
- [x] 6.7 Idempotent retries return the original result.
- [x] 6.8 Emit existing SSE events and activity logs.
- [x] 6.9 Tests for auth, price tampering, confirmation, duplicates.
- Completion criteria: model cannot finalize anything; duplicate confirms are
      safe; another user cannot confirm or read a draft.

### Phase 7 — API, security, reliability

- [x] 7.1 Mount `/api/ai` with optional/required JWT middleware.
- [x] 7.2 Rate limiting, message-size limits, body validation, timeouts.
- [x] 7.3 Separate public/authenticated/admin capabilities.
- [x] 7.4 Prompt-injection defenses and no write tools for the model.
- [x] 7.5 No secrets/PII/full conversations in logs.
- [x] 7.6 Clear 503/504 behavior when provider/RAG is unavailable.
- [x] 7.7 Update Caddy and SPA fallback routing for `/api/ai`.
- [x] 7.8 Tests for authorization boundaries and limiter behavior.
- Completion criteria: existing auth controls are not weakened; public tools
      expose only customer-facing data.

### Phase 8 — Testing and quality

- [x] 8.1 Backend unit tests for config, provider, registry, tools, RAG, agent,
      actions, auth/limits.
- [x] 8.2 Frontend tests for chat states, confirmation, accessibility.
- [x] 8.3 Run backend tests/build and frontend tests/typecheck/build (no lint
      script is defined in either package).
- [x] 8.4 Fix regressions introduced by this feature.
- Completion criteria: relevant suites pass; unrun checks are documented.

### Phase 9 — Documentation and deployment

- [x] 9.1 Update `backend/.env.example` with placeholders only.
- [x] 9.2 Document LLM/embedding setup (hosted and local Ollama).
- [x] 9.3 Document knowledge ingestion and re-indexing.
- [x] 9.4 Document AI API endpoints, tools, security decisions, limitations.
- [x] 9.5 Update README and deployment notes.
- [x] 9.6 Record actual commands/results and remaining limitations.
- Completion criteria: a new developer can configure and run the feature locally
      without any real secret committed.


### Phase 10 — Multilingual waiter interpreter (text first, optional voice)

**Goal:** help a human waiter and customer communicate across languages while
keeping the waiter in control. This is a distinct interpreter mode, not a new
customer assistant. It is additive to the existing virtual waitress and must not
change current ordering or reservation behavior. Translation has no access to
the business tool registry and can never submit an order or reservation.

- [x] 10.1 Inspect the existing AI provider, config, routes, middleware, rate
      limiting, runtime, menu/settings services, tests and frontend assistant
      patterns; confirm branch/working tree before changes.
- [x] 10.2 Expand this Phase 10 checklist before application changes.
- [x] 10.3 Add a curated language registry (codes, English/native labels, text
      direction, browser speech locales) with explicit unsupported-code handling.
      Do not claim that the configured model supports a language pair; document
      that provider coverage is unverified.
- [x] 10.4 Add translation configuration validated with zod: env-overridable
      base URL/key/model/timeout, safe fallback to the existing LLM settings,
      input-length/glossary/rate limits and a separate disable switch. Do not
      expose keys in status output.
- [x] 10.5 Add a translation-specific provider interface over the existing
      OpenAI-compatible client. Use explicit source/target language parameters,
      send no tools, request structured JSON, validate output (including empty/
      oversized content) and map timeout/rate-limit/network/malformed failures to
      safe typed errors.
- [x] 10.6 Add restaurant-aware terminology context built only from live menu
      names/categories/stored descriptions and restaurant name, bounded to a
      small glossary with a graceful DB-failure fallback. Never invent
      ingredients, prices, availability, allergens or policies.
- [x] 10.7 Add conservative safety checks for allergy/dietary terms,
      cross-contamination, negation/conditions, quantities, prices, currency and
      reservation details. Flag numeric mismatches and provider uncertainty, and
      require explicit human verification for every safety-sensitive result. A
      translated allergy statement is never proof that food is safe.
- [x] 10.8 Add `GET /api/ai/interpreter/languages` and staff/admin-only
      `POST /api/ai/interpreter/translate`. Validate bodies/languages with zod,
      enforce input limits and rate limiting, apply request timeout/cancellation,
      keep provider keys server-side and return stable safe errors. Do not persist
      translations or conversation history.
- [x] 10.9 Implement the `/interpreter` staff UI with waiter/customer language
      selectors, swap/direction controls, separate waiter and customer inputs,
      session-local history, distinct original/translated display, loading/empty/
      success/error states, retry/edit/copy, safety/uncertainty warnings and a new
      conversation action. Keep it responsive and keyboard accessible.
- [x] 10.10 Add an optional browser speech-recognition adapter behind an
      interface: explicit push-to-talk, permission request only after user action,
      transcript inserted for review, cancel, stop microphone on completion and
      graceful unsupported/denied handling. Text mode remains fully functional.
- [x] 10.11 Add an optional browser speech-synthesis adapter behind an interface:
      explicit speak action only, stop control, target-language locale, and
      graceful unsupported/voice-unavailable fallback. Never auto-speak safety-
      sensitive or other translated text.
- [x] 10.12 Add backend tests for both directions, language validation, empty/
      oversized input, timeouts/rate limits/provider errors, malformed output,
      auth/roles, no tool access, bounded restaurant context, safety/negation/
      quantities and secret-free errors. Use mocks only.
- [x] 10.13 Add frontend tests for language/direction selection, sending both
      directions, preserved originals, loading/error/retry/edit/copy, safety
      warnings, and microphone denial/unsupported plus TTS fallback.
- [x] 10.14 Document interpreter purpose vs. virtual waitress, configuration,
      curated languages/provider-coverage caveat, privacy/provider disclosure,
      limitations, local run, test commands, manual smoke test and mandatory human
      verification for allergy/price/quantity/reservation details.
- [x] 10.15 Run backend build/tests, frontend typecheck/tests/build and a
      disabled/no-provider smoke test; review the complete diff for regressions,
      secrets, unsafe behavior and unfinished tasks. Record actual results.
- Completion criteria: a signed-in staff waiter can exchange text in both
      directions with both originals and translations preserved; errors and
      uncertainty are surfaced; no order/reservation action can be triggered from
      translation; provider credentials remain server-side; text mode works when
      speech APIs are absent; checks pass and limitations are documented honestly.

## 5. Dependencies between tasks

- Phase 1 config/provider/registry block all tool, RAG, agent, and route work.
- Phase 2 tools depend on Phase 1 registry and existing persistence helpers.
- Phase 3 depends on provider embeddings and new RxDB collections; knowledge
  search tool depends on Phase 3.
- Phase 4 depends on Phases 1–3 and conversation persistence.
- Phase 5 depends on the Phase 4 chat contract and draft artifacts.
- Phase 6 depends on Phase 1 registry, Phase 2 availability/menu tools, Phase 3
  nothing, and shared order/reservation services.
- Phase 7 depends on routes/actions existing.
- Phases 8–9 depend on the implemented feature; tests are written alongside each
  phase and finalized at the end.
- Phase 10 depends on the existing assistant UI and provider abstraction, but its
  translation service should remain separate from the order/reservation tool
  dispatcher. Voice adapters depend on a verified speech provider and explicit
  microphone/privacy UX.

## 6. Decisions requiring verification / limitations

- **Vector store:** RxDB/SQLite has no verified vector-search extension in this
  repository. Decision: bounded in-process cosine over RxDB chunks behind a
  `VectorStore` interface. Verify performance if the knowledge base exceeds the
  configured `AI_RAG_MAX_CHUNKS`; move to pgvector/Qdrant only when needed.
- **Reservation availability:** existing code has a whole-day table-occupancy
  convention and no capacity/opening-hours data. The AI will use the same
  conservative rule (any confirmed reservation on that date occupies the table),
  report `capacityVerified: false` and `openingHoursVerified: false`, and never
  promise more than the backend can substantiate.
- **Customer reservations:** existing GraphQL creation is staff-only. The AI adds
  a customer flow that stores the authenticated user id and reuses reservation
  validation/persistence. It does not expose staff status controls.
- **Order creation:** existing resolver trusts client prices. The AI path always
  re-prices from current menu documents and revalidates availability. The
  existing resolver is left behavior-compatible and only shares table-busy
  helpers.
- **Currency:** the UI and seed data use `$`; no currency setting exists. The AI
  will format prices with `$` to match the existing UI and document the
  assumption.
- **Opening hours:** not stored anywhere; must not be invented.
- **Dietary/allergen data:** not stored; must not be inferred from names.
- **Provider availability:** no credentials in this environment. Real calls are
  not executed in the test suite; mocked integration tests are used.

## 7. Progress log

### Status: core virtual waitress complete; multilingual interpreter implemented

Phases 0–9 describe the core text-based AI virtual waitress and are recorded as
implemented in this branch. Phase 10 adds the staff-facing multilingual waiter
interpreter. It is additive: `/assistant` behavior, order/reservation drafts and
the confirm flow are unchanged, and translation has no tool access. The feature
is disabled by default (`AI_ENABLED=false` and/or missing translation provider
settings). The branch comparison shows one commit ahead of
`feature/rxdb-migration`; see Git history for repository state. Do not assume
the remote branch contains uncommitted local changes.

### Completed

- Phase 0: inspection, branch creation, plan.
- Phase 1: config, provider, errors, registry, bounded execution.
- Phase 2: read-only tools and honest metadata limitations.
- Phase 3: RxDB knowledge collections, chunker, cosine store, ingestion,
  citations, admin endpoints, built-in knowledge, CLI.
- Phase 4: agent loop, prompt safety, conversation persistence, artifacts.
- Phase 5: `/assistant` UI, cards, citations, drafts, confirmation, accessibility,
  conversation restore, frontend tests.
- Phase 6: shared order service, server-priced drafts with a snapshot of the
  reviewed prices/total, customer reservations, explicit confirm endpoint,
  expiry/ownership/locking/idempotent deterministic ids, SSE/activity logging.
  Confirmation rejects a draft if menu items or prices changed after review.
- Phase 7: AI router, JWT middleware, rate limits, validation, timeouts,
  prompt-injection defenses, Caddy/SPA routing.
- Phase 8: backend AI suites and frontend assistant suite; full checks run.
- Phase 9: env example, README setup/API/safety/limitations, deployment notes,
  TODO verification record, final report.
- Phase 10: curated language registry; dedicated zod-validated translation
  config with LLM fallback; no-tools translation provider with structured output
  and safe errors; bounded live menu/settings glossary; conservative
  allergy/diet/contamination/negation/quantity/price/reservation safety flags and
  numeric-mismatch detection; staff/admin languages/translate endpoints with
  input limits, rate limiting, timeout/client cancellation and no persistence;
  `/interpreter` UI with language selection, swap, both directions, preserved
  originals, session-only history, retry/edit/copy, uncertainty warnings, and
  optional speech recognition/synthesis that degrades to text; backend and
  frontend tests; env/docs updates; build/test/smoke verification.

### Blocked / not run

- Real LLM/embedding smoke test: requires a configured provider endpoint and
  credentials, which are not available in this environment. Provider, agent,
  RAG and action paths are covered by mocked tests. Run the commands below
  against the intended hosted or Ollama endpoint before production rollout.
- Real interpreter translation smoke test: no translation provider
  endpoint/credentials were available, so every translation test uses a mocked
  provider. Manual browser speech recognition/synthesis was not exercised in a
  real browser; the adapters are tested through mocks and text mode is verified.

### Final verification record (2026-11-13)

Commands were run from the repository with the local Node toolchain:

| Check | Command | Result |
| --- | --- | --- |
| Backend compile | `cd backend && npm run build` | Passed (`tsc`) |
| Backend tests | `cd backend && npx jest --runInBand` | 26 suites, 234 tests passed |
| Frontend typecheck | `cd frontend && npx tsc --noEmit` | Passed |
| Frontend tests | `cd frontend && CI=true npm test -- --watchAll=false` | 30 suites, 192 tests passed |
| Frontend production build | `cd frontend && CI=true npm run build` | Compiled successfully |

Notes:

- Neither package defines a lint script, so lint was not run. Type checks,
  builds and the full Jest suites were used as the available quality gates.
- Frontend tests emit existing React Router/MUI `act`/future-flag warnings and
  some Assistant test console network errors; all suites still pass. These are
  test-console noise, not failures.
- A local smoke start with `AI_ENABLED=false node dist/server.js` served
  `GET /api/ai/health` with `status: "disabled"`. The server was stopped after
  the check.
- Live provider, real embedding, Ollama and real order/reservation confirmation
  smoke tests were not run because no provider credentials/endpoint were
  available. The write paths are exercised with mocked persistence/services.
- Pre-existing mode-only working-tree changes were preserved; no files were
  committed or discarded.

### Phase 10 verification record (2026-11-14)

| Check | Command | Result |
| --- | --- | --- |
| Backend compile | `cd backend && npm run build` | Passed (`tsc`) |
| Backend tests | `cd backend && npx jest --runInBand` | 27 suites, 252 tests passed |
| Frontend typecheck | `cd frontend && npx tsc --noEmit` | Passed |
| Frontend tests | `cd frontend && CI=true npx react-scripts test --watchAll=false --runInBand` | 31 suites, 204 tests passed |
| Frontend production build | `cd frontend && npm run build` | Compiled successfully |
| Disabled smoke test | `AI_ENABLED=false node dist/server.js` on port 5055 | `GET /api/ai/interpreter/languages` → 200, `GET /api/ai/health` → `status: "disabled"`, `interpreterEnabled: false`, `translationConfigured: false`; unauthenticated `POST /api/ai/interpreter/translate` → 401 `UNAUTHENTICATED` |

Notes:

- The new interpreter suite covers both directions, language/input validation,
  timeouts/provider failures, malformed output, auth roles, no-tools behavior,
  bounded glossary context, safety/negation/quantities, numeric mismatches and
  secret-free errors. The frontend suite covers language/swap controls, both
  directions, preserved originals, loading/error/retry/edit/copy, safety
  warnings, unsupported speech, denied microphone and explicit TTS playback.
- No live translation provider call was made (no endpoint/credentials). The
  model's coverage for each curated language pair remains unverified and must be
  checked by the restaurant before relying on it.
- No lint script exists in either package.

### Known limitations

- The interpreter is an assistance tool, not a guarantee: curated languages do
  not prove provider coverage for a pair, and translations of allergy, dietary,
  cross-contamination, price, quantity or reservation details always require
  human verification. Translation has no tools and cannot write; history is not
  persisted.
- The virtual waitress `/assistant` is text chat, not a two-way interpreter;
  speech recognition/synthesis in `/interpreter` depends on browser Web Speech
  support and falls back to text when unavailable.
- No opening-hours, per-table capacity, dietary or allergen data exists, so the
  assistant must report those as unavailable rather than infer them.
- Reservation availability uses the existing conservative whole-date occupancy
  convention and reports capacity/opening hours as unverified.
- Prices use USD/`$` because the app has no currency setting.
- Retrieval is bounded in-process cosine similarity over RxDB chunks, not a
  dedicated vector database.
- Rate limits, draft processing locks and embeddings are single-process. The
  deterministic `ai-<draftId>` write id is the durable idempotency guard.
- No payment integration was added; card/cash remains a label only.
- The existing GraphQL reservation mutation remains staff/admin-only; the AI
  confirmation endpoint is the narrowly scoped customer reservation path.

## 8. Verification commands

```bash
# Backend
cd backend
npm run build
npx jest --runInBand

# Frontend
cd frontend
npx tsc --noEmit
CI=true npm test -- --watchAll=false
CI=true npm run build

# Optional live knowledge ingestion (requires AI_ENABLED=true and embeddings)
cd backend
npm run ai:ingest
npm run ai:ingest -- --dir ./path

# Optional live smoke test (configure AI_* first)
cd backend
npm start
curl http://localhost:5000/api/ai/health
```
