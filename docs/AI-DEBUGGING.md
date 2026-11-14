# AI Features — Debugging Guide

Use this guide to find which layer is failing before changing code. Start with one request and follow it from browser to backend.

## 1. Check the running state

1. Start the backend using the repository's normal development command.
2. Inspect startup output for database initialization and AI configuration errors.
3. Request `GET /api/ai/health` from the running backend.
4. Confirm the response reflects the intended AI and interpreter configuration.
5. Open browser DevTools → Network and inspect the failed request's status and response body.

Do not put provider API keys into frontend environment variables or browser requests.

## 2. Common symptoms

| Symptom | Inspect first |
|---|---|
| `/api/ai/health` reports disabled | `backend/ai/config.ts`, environment variables, `backend/ai/runtime.ts` |
| Backend starts but AI runtime is not ready | Startup logs, LLM base URL/model/key, provider validation |
| Chat request returns 400 | Request schema in `backend/ai/routes.ts`, message length and body fields |
| Chat request returns 429 | AI rate-limit configuration and request frequency |
| Chat returns 502/504 | Provider response, network connectivity, model availability, timeout settings |
| Model answers without using a tool | `prompts.ts`, tool definitions, provider tool-call compatibility, `agent.ts` |
| Tool call fails | `toolRegistry.ts`, target file under `backend/ai/tools/`, shared service |
| Guest chat works but order/reservation draft fails | Authentication state, tool access level, current user context |
| Draft price differs or confirmation conflicts | `draftTools.ts`, `confirmActions.ts`, current menu prices/table state |
| Conversation restore fails | session storage ID, auth identity, `conversationService.ts`, conversation ownership |
| Interpreter page is missing/disabled | `frontend/src/App.tsx`, `AI_ENABLED`, `AI_INTERPRETER_ENABLED`, translation provider config |
| Interpreter returns 401/403 | JWT token and staff/admin role; translation endpoint is staff-only |
| Translation works but raises warning | Inspect `safety.ts` and response verification fields; warnings are intentional review signals |
| Speech input does not start | Browser support, microphone permission, secure context, `speechRecognition.ts` |
| No spoken translation | Browser speech voices, selected locale, `speechSynthesis.ts`; use text fallback |

## 3. Trace a chat request

Follow this exact sequence:

1. Browser: `frontend/src/pages/Assistant.tsx` → `sendAiMessage()`.
2. HTTP: `POST /api/ai/chat`.
3. Route: `backend/ai/routes.ts`.
4. Runtime: `backend/ai/runtime.ts`.
5. Agent: `backend/ai/agent.ts`.
6. Provider: `backend/ai/provider.ts`.
7. If tools are requested: `backend/ai/toolRegistry.ts` → the selected tool.
8. If knowledge search is requested: `backend/ai/tools/knowledgeTool.ts` → `KnowledgeService`.
9. If a draft is created: `draftTools.ts` → `draftService.ts`.
10. Browser renders the JSON response returned by the route.

At each step, check the actual input and output. Avoid debugging the model prompt first if the request never reached the provider.

## 4. Trace a translation request

1. Browser: `frontend/src/pages/Interpreter.tsx`.
2. Client: `frontend/src/api/interpreter.ts`.
3. HTTP: `POST /api/ai/interpreter/translate`.
4. Route authorization and validation: `backend/ai/routes.ts`.
5. Translation orchestration: `backend/ai/interpreter/service.ts`.
6. Restaurant terminology: `backend/ai/interpreter/glossary.ts`.
7. Provider adapter: `backend/ai/interpreter/translationProvider.ts`.
8. Safety checks: `backend/ai/interpreter/safety.ts`.
9. JSON response → UI displays translation and any human-verification warning.

The translation endpoint does not use the waitress tool registry. Do not debug translation by looking for order tools.

## 5. Trace a confirmation failure

A pending draft is not a completed order or reservation.

1. Confirm the browser sent the correct `draftId`.
2. Check that the user is authenticated.
3. Inspect `loadConfirmableDraft()` in `draftService.ts` for ownership, expiry, and status.
4. For orders, inspect server-priced item revalidation and table checks in `confirmActions.ts` and `orderService.ts`.
5. For reservations, inspect `availabilityService.ts` and `reservationService.ts`.
6. Check whether the menu price or table availability changed after the draft was prepared.
7. Inspect the returned safe error code/message. Do not bypass the checks to make the UI succeed.

## 6. Run checks

Use the scripts that exist in the checked-out version of each package. Typical commands are:

- Backend build: from `backend/`, `npm run build`.
- Backend tests: from `backend/`, `npm test`.
- Frontend tests: from `frontend/`, `npm test -- --watchAll=false`.
- Frontend type check/build: use the scripts defined in `frontend/package.json`; this repository may use the Create React App build as the TypeScript check.

Before relying on a command, inspect the relevant `package.json`. Do not report tests as passing unless you ran them and saw a successful exit.

## 7. Safe debugging habits

- Never log provider API keys or authorization headers.
- Avoid logging full customer messages, transcripts, or personal contact details.
- Use mocked provider responses in automated tests.
- Do not disable authorization, draft ownership, expiry, or confirmation checks to simplify debugging.
- Do not treat the safety warning as a guarantee; both false positives and missed issues are possible.
- Do not assume a configured language is supported by the provider or by browser speech.
