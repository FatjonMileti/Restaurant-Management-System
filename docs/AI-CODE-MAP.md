# AI Features — Code Map

Branch: `feature/ai-virtual-waitress`

This guide explains where the AI features live and which files to read first. It describes the current implementation, not a proposed architecture.

## Start here

Read these in order:

1. `backend/server.ts` — mounts the AI API and initializes the AI runtime.
2. `backend/ai/runtime.ts` — constructs providers, RAG, tools, agent, and interpreter.
3. `backend/ai/routes.ts` — HTTP entry points and request validation.
4. `backend/ai/agent.ts` — the virtual-waitress tool-calling loop.
5. `backend/ai/tools/index.ts` and `backend/ai/toolRegistry.ts` — which tools exist and how they are validated/executed.
6. `backend/ai/actions/confirmActions.ts` — the separate, explicit order/reservation confirmation path.
7. `frontend/src/pages/Assistant.tsx` and `frontend/src/api/ai.ts` — customer-facing chat.
8. `frontend/src/pages/Interpreter.tsx` and `frontend/src/api/interpreter.ts` — staff-facing translation UI.

## High-level map

| Area | Main files | Responsibility |
|---|---|---|
| App startup | `backend/server.ts` | Connects database, initializes AI, mounts `/api/ai` |
| Configuration/runtime | `backend/ai/config.ts`, `runtime.ts` | Reads environment variables and builds services |
| LLM communication | `backend/ai/provider.ts` | OpenAI-compatible chat/embedding HTTP calls |
| Waitress agent | `backend/ai/agent.ts`, `prompts.ts` | Sends messages to the model and handles requested tools |
| Tool validation | `backend/ai/toolRegistry.ts`, `tools/*` | Validates tool arguments, checks access, executes allow-listed operations |
| Conversation persistence | `backend/ai/conversation/conversationService.ts` | Saves authenticated conversations and messages |
| Draft lifecycle | `backend/ai/conversation/draftService.ts` | Creates and tracks pending order/reservation drafts |
| Final business writes | `backend/ai/actions/confirmActions.ts` | Revalidates and creates an order/reservation after explicit confirmation |
| Knowledge/RAG | `backend/ai/rag/*`, `backend/ai/tools/knowledgeTool.ts` | Ingests approved text and retrieves relevant chunks |
| Translation | `backend/ai/interpreter/*` | Translates text, uses menu terminology, flags uncertain/safety-sensitive output |
| AI HTTP API | `backend/ai/routes.ts`, `middleware.ts`, `rateLimit.ts` | Routes, authentication, validation, limits, timeouts |
| Chat UI | `frontend/src/pages/Assistant.tsx`, `components/assistant/*` | Renders messages, menu items, citations, and drafts |
| Interpreter UI | `frontend/src/pages/Interpreter.tsx`, `services/speechRecognition.ts`, `services/speechSynthesis.ts` | Text-first translation plus optional browser speech |
| Shared restaurant rules | `backend/services/availabilityService.ts`, `orderService.ts`, `reservationService.ts` | Business validation shared with non-AI flows |

## Two separate AI experiences

### Virtual waitress — `/assistant`

The model may request approved backend tools to answer questions using live menu data, availability checks, and knowledge retrieval. It may prepare an order or reservation draft. It cannot finalize that draft through a model tool call.

### Waiter interpreter — `/interpreter`

The staff-facing interpreter translates a message between two selected languages. Its service has no reference to the waitress tool registry, draft service, or order/reservation write actions. Translation is not an order command and must not create business records.

## Important boundary

The LLM is not the source of truth for menu prices, table availability, or saved records. Backend services validate those values. The model can request a draft; only the confirmation endpoint can turn an eligible draft into an order or reservation.

## Where to go next

- To understand a normal chat request, read [AI-WAITRESS-FLOW.md](./AI-WAITRESS-FLOW.md).
- To understand translation, read [AI-INTERPRETER-FLOW.md](./AI-INTERPRETER-FLOW.md).
- To understand retrieval, read [AI-RAG-FLOW.md](./AI-RAG-FLOW.md).
- To troubleshoot configuration and tests, read [AI-DEBUGGING.md](./AI-DEBUGGING.md).
