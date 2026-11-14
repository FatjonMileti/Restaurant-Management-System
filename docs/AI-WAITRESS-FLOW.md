# Virtual Waitress — Request Lifecycle

This document follows one customer message from the React page through the backend and back. It focuses on the code path, not on prompt-writing theory.

## The flow at a glance

1. The customer enters a message in `frontend/src/pages/Assistant.tsx`.
2. The page calls `sendAiMessage()` from `frontend/src/api/ai.ts`.
3. The client sends `POST /api/ai/chat`.
4. `backend/ai/routes.ts` validates and rate-limits the request.
5. For an authenticated user, the route loads or creates a conversation and stores the user message. Guest history is accepted from the request and bounded by configuration.
6. The route builds the system prompt and calls `runtime.agent.run()`.
7. `WaitressAgent` calls the configured LLM provider. If the model requests tools, the agent passes each request to `ToolRegistry`.
8. The registry validates arguments and access, then executes only registered tool handlers.
9. The agent returns the final text plus structured artifacts (menu items, citations, availability, draft) and a tool-call trace.
10. The route stores the assistant response for authenticated conversations and returns JSON.
11. The React page renders the assistant message and any cards/citations/draft confirmation UI.

## Key files and their roles

### 1. Startup and runtime

- `backend/server.ts` mounts `createAiRouter()` at `/api/ai`.
- During startup, the server connects to the database and calls `initializeAi()`.
- `backend/ai/runtime.ts` loads config and creates:
  - `OpenAICompatibleProvider` for chat and embeddings;
  - optional `KnowledgeService` and `RxDbVectorStore`;
  - the tool registry;
  - `WaitressAgent`;
  - optional `InterpreterService`.

The AI feature is optional. Invalid AI configuration should not take down the existing GraphQL application; inspect the startup logs and AI health endpoint when it fails.

### 2. HTTP route

The route in `backend/ai/routes.ts` is the coordinator. It handles input validation, rate limiting, conversation ownership/history, timeouts, and response formatting. It should not contain the detailed business rules for creating orders or checking reservations.

Useful endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/ai/health` | Runtime status and knowledge document count |
| `POST /api/ai/chat` | Run a waitress turn |
| `GET /api/ai/conversations/:id` | Restore an authenticated user's conversation |
| `POST /api/ai/actions/confirm` | Explicitly confirm an existing draft |
| `GET /api/ai/knowledge` | Admin knowledge-document listing |
| `POST /api/ai/knowledge` | Admin knowledge-document ingestion |
| `PUT /api/ai/knowledge/:id` | Admin update/re-ingestion |
| `DELETE /api/ai/knowledge/:id` | Admin deletion |
| `POST /api/ai/knowledge/:id/reindex` | Admin reindex operation |

Knowledge routes have additional details in [AI-RAG-FLOW.md](./AI-RAG-FLOW.md).

### 3. Agent and tool calling

Read `backend/ai/agent.ts` next. The agent is a bounded loop:

- Build provider messages from system prompt, conversation history, and the current user message.
- Ask the provider for a response and optional tool calls.
- If there are no tool calls, return the text.
- If tool calls exist, execute only the allowed number through the registry, append their results to the model conversation, and ask the model again.
- Stop when the model answers or the configured iteration/tool-call limits are reached.

The agent also collects structured artifacts for the frontend. A tool call is not automatically a final business action: tools can read information or prepare drafts, but the final write is separate.

### 4. Tool registry

`backend/ai/tools/index.ts` is the list of tools available to the model. Current groups include:

- Menu search and item details: `menuTools.ts`
- Restaurant information: `restaurantTools.ts`
- Table availability: `availabilityTool.ts`
- Knowledge retrieval: `knowledgeTool.ts`
- Order/reservation draft preparation: `draftTools.ts`

`backend/ai/toolRegistry.ts` is the execution boundary. It validates arguments with each tool's schema, applies access rules and timeouts, and returns structured success/failure results. A tool that is not registered is not available to the model.

### 5. Order and reservation drafts

The draft tools in `backend/ai/tools/draftTools.ts` prepare a proposal; they do not submit it.

**Order draft path**
1. The user must be authenticated.
2. The server checks the table number.
3. The server resolves menu IDs and prices from current database records.
4. The server checks table availability and computes the total.
5. The server saves a time-limited draft with a price snapshot.
6. The UI displays the draft for review.

**Reservation draft path**
1. The user must be authenticated.
2. The server validates contact phone information.
3. `availabilityService.ts` checks the requested date/time/party size under the application's current availability convention.
4. The server selects an available table and stores a time-limited draft.
5. The UI displays the reservation details for review.

### 6. Explicit confirmation

When the customer clicks Confirm, the frontend calls `confirmAiDraft()`, which sends `POST /api/ai/actions/confirm`.

`backend/ai/actions/confirmActions.ts` then:

1. Loads the draft and checks that it belongs to the signed-in user.
2. Checks status and expiry.
3. Acquires a per-draft in-process lock.
4. Revalidates order prices/table state or reservation availability.
5. Creates the business record through shared backend services.
6. Uses a deterministic ID based on the draft ID to make retries safer.
7. Marks the draft completed and records an activity log.

The model does not get a `confirm_order` or `confirm_reservation` tool. This separation is intentional.

## Data that crosses the API boundary

The chat response includes:

- `message`: assistant text and timestamp;
- `conversationId`: present for authenticated conversations;
- `toolCalls`: trace metadata, not executable tools;
- `menuItems`, `citations`, `availability`: optional display artifacts;
- `draft`: a pending order/reservation proposal, if prepared;
- `suggestions`: follow-up suggestions;
- `truncated`: whether output had to be bounded.

See `frontend/src/api/ai.ts` for the TypeScript contract and `Assistant.tsx` for how the UI consumes it.

## Debugging this flow

- Request never reaches backend: inspect browser Network tab, `REACT_APP_AI_API_URL`, and frontend proxy.
- AI disabled/configuration error: inspect `backend/ai/config.ts`, `runtime.ts`, and `GET /api/ai/health`.
- Model responds but does not call a tool: inspect `prompts.ts`, tool definitions, provider compatibility, and agent traces.
- Tool returns an error: inspect the specific file in `backend/ai/tools/` and the shared service it calls.
- Draft looks wrong: inspect `draftTools.ts` and its artifact mapping.
- Confirmation fails: inspect `confirmActions.ts`, `draftService.ts`, and `orderService.ts` or `availabilityService.ts`.

See [AI-DEBUGGING.md](./AI-DEBUGGING.md) for a practical checklist.
