# Developer Documentation

This folder contains practical documentation for understanding and operating the project.

## AI virtual waitress and interpreter

Read these in order if you are trying to follow the AI code:

1. [AI Code Map](./AI-CODE-MAP.md) — where the main modules live and what each is responsible for.
2. [Virtual Waitress Request Lifecycle](./AI-WAITRESS-FLOW.md) — how chat, tools, drafts, and explicit confirmation work.
3. [Waiter Interpreter Flow](./AI-INTERPRETER-FLOW.md) — how two-way translation, terminology context, safety warnings, and optional browser speech work.
4. [Knowledge and RAG Flow](./AI-RAG-FLOW.md) — how approved documents are embedded, stored, retrieved, and cited.
5. [AI Debugging Guide](./AI-DEBUGGING.md) — how to trace failures and run checks.

## Deployment

- [Deployment with Caddy](./DEPLOYMENT.md) — HTTPS deployment, AI configuration, and interpreter configuration.

## Suggested learning path

Do not try to understand every AI file at once. Start with the route and follow one request end to end:

- For chat: `Assistant.tsx` → `api/ai.ts` → `routes.ts` → `agent.ts` → `toolRegistry.ts` → a specific tool.
- For translation: `Interpreter.tsx` → `api/interpreter.ts` → `routes.ts` → `interpreter/service.ts` → provider and safety checks.
- For a confirmed order/reservation: UI confirmation → `routes.ts` → `actions/confirmActions.ts` → shared business services.

These docs explain the current code path. If implementation changes, update the relevant guide in the same change.
