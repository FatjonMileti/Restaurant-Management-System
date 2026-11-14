import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { z } from 'zod';
import { getOrCreateRestaurantSettings } from '../graphql/helpers/formatters.js';
import {
  AiError,
  AiErrorCodes,
  aiValidationError,
  interpreterDisabledError,
  toSafeErrorPayload,
} from './errors.js';
import {
  requireAiAuth,
  requireAiAdmin,
  requireAiWaiter,
  optionalAiAuth,
  toAiUser,
} from './middleware.js';
import { listInterpreterLanguages } from './interpreter/languages.js';
import { createRateLimiter } from './rateLimit.js';
import { getAiStatus, requireAiRuntime } from './runtime.js';
import { buildSystemPrompt, suggestedFollowUps } from './prompts.js';
import {
  appendConversationMessage,
  createConversation,
  getConversationForUser,
  getConversationMessages,
  getRecentConversationMessages,
} from './conversation/conversationService.js';
import { confirmDraft } from './actions/confirmActions.js';
import type { ConversationRecord } from './conversation/conversationService.js';

const chatBodySchema = z
  .object({
    message: z.string().min(1, 'Message is required').max(20000),
    conversationId: z.string().trim().min(1).max(100).optional(),
    history: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(12000),
          })
          .strict(),
      )
      .max(10)
      .optional(),
  })
  .strict();

const confirmBodySchema = z.object({ draftId: z.string().trim().min(1).max(100) }).strict();

const translateBodySchema = z
  .object({
    message: z.string().max(20000),
    sourceLanguage: z.string().trim().min(1).max(35),
    targetLanguage: z.string().trim().min(1).max(35),
    direction: z.enum(['waiter-to-customer', 'customer-to-waiter']),
  })
  .strict();

const knowledgeBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(50000),
    sourceType: z.string().trim().min(1).max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const validateBody = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].filter(
      Boolean,
    );
    throw aiValidationError(
      fields.length ? `Invalid request fields: ${fields.join(', ')}` : 'Invalid request body.',
    );
  }
  return parsed.data;
};

const runWithTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal,
  timeoutMessage = 'The assistant took too long to respond. Please try again.',
): Promise<T> => {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AiError(AiErrorCodes.PROVIDER_TIMEOUT, timeoutMessage, 504));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
};

const asyncHandler =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

export const createAiRouter = (): Router => {
  const router = Router();
  const configProvider = () => requireAiRuntime().then((runtime) => runtime.config);

  router.use(optionalAiAuth);

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const status = await getAiStatus();
      let knowledgeDocuments: number | null = null;
      try {
        const runtime = await requireAiRuntime();
        if (runtime.knowledge) {
          knowledgeDocuments = (await runtime.knowledge.listDocuments()).length;
        }
      } catch {
        knowledgeDocuments = null;
      }
      res.json({ ...status, knowledgeDocuments });
    }),
  );

  // Curated language options are safe to list without authentication. The
  // translate endpoint itself is staff-only.
  router.get(
    '/interpreter/languages',
    asyncHandler(async (_req, res) => {
      const status = await getAiStatus();
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        enabled: Boolean(
          (status as { interpreterEnabled?: boolean }).interpreterEnabled,
        ),
        languages: listInterpreterLanguages(),
      });
    }),
  );

  router.post(
    '/interpreter/translate',
    requireAiWaiter,
    asyncHandler(async (req, res) => {
      const config = await configProvider();
      const limiter = interpreterLimiterFor(
        config.limits.windowMs,
        config.interpreter.rateLimitMax,
      );
      await new Promise<void>((resolve, reject) => {
        limiter(req, res, (error?: unknown) => (error ? reject(error) : resolve()));
      });
      if (res.headersSent) return;

      const body = validateBody(translateBodySchema, req.body);
      if (body.message.trim().length === 0) {
        throw aiValidationError('Message must not be empty.');
      }
      if (body.message.length > config.interpreter.maxInputChars) {
        throw aiValidationError(
          `Message must be at most ${config.interpreter.maxInputChars} characters.`,
        );
      }

      const runtime = await requireAiRuntime();
      if (!runtime.interpreter) throw interpreterDisabledError();

      const clientAbort = new AbortController();
      const onClose = () => {
        if (!res.writableEnded) clientAbort.abort();
      };
      res.on('close', onClose);
      try {
        const result = await runWithTimeout(
          (signal) =>
            runtime.interpreter!.translate({
              text: body.message,
              sourceLanguage: body.sourceLanguage,
              targetLanguage: body.targetLanguage,
              direction: body.direction,
              signal,
            }),
          (config.interpreter.translation?.timeoutMs ?? config.requestTimeoutMs) + 5000,
          clientAbort.signal,
          'The translation took too long. Please try again.',
        );
        if (res.writableEnded) return;
        res.json(result);
      } finally {
        res.off('close', onClose);
      }
    }),
  );

  router.post(
    '/chat',
    asyncHandler(async (req, res) => {
      // The limiter is created lazily because its window depends on config.
      const config = await configProvider();
      const limiter = chatLimiterFor(config.limits.windowMs, config.limits.chatMax);
      await new Promise<void>((resolve, reject) => {
        limiter(req, res, (error?: unknown) => (error ? reject(error) : resolve()));
      });
      if (res.headersSent) return;

      const body = validateBody(chatBodySchema, req.body);
      if (body.message.length > config.maxMessageChars) {
        throw aiValidationError(`Message must be at most ${config.maxMessageChars} characters.`);
      }

      const runtime = await requireAiRuntime();
      const user = req.user ? toAiUser(req) : undefined;
      let conversation: ConversationRecord | null = null;
      let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      if (user) {
        if (body.conversationId) {
          conversation = await getConversationForUser(body.conversationId, user.id);
        }
        if (conversation) {
          const stored = await getRecentConversationMessages(
            conversation.id,
            config.maxHistoryMessages,
          );
          history = stored.map((message) => ({ role: message.role, content: message.content }));
        } else {
          conversation = await createConversation(user.id, body.message);
        }
        await appendConversationMessage(conversation.id, 'user', body.message);
      } else {
        history = (body.history ?? [])
          .slice(-config.maxHistoryMessages)
          .map((message) => ({ role: message.role, content: message.content }));
      }

      const settings = await getOrCreateRestaurantSettings();
      const systemPrompt = buildSystemPrompt({
        restaurantName: settings.name ?? '',
        timeZone: config.restaurantTimeZone,
      });

      const result = await runWithTimeout(
        (signal) =>
          runtime.agent.run({
            systemPrompt,
            history,
            userMessage: body.message,
            context: {
              userId: user?.id,
              user,
              conversationId: conversation?.id,
              signal,
            },
            signal,
          }),
        config.requestTimeoutMs,
      );

      if (conversation) {
        await appendConversationMessage(conversation.id, 'assistant', result.content);
      }

      res.json({
        conversationId: conversation?.id ?? null,
        message: {
          role: 'assistant',
          content: result.content,
          createdAt: new Date().toISOString(),
        },
        toolCalls: result.toolCalls,
        menuItems: result.artifacts.menuItems,
        citations: result.artifacts.citations,
        draft: result.artifacts.draft,
        availability: result.artifacts.availability,
        suggestions: suggestedFollowUps({
          hasDraft: Boolean(result.artifacts.draft),
          draftKind: result.artifacts.draft?.kind,
          hasMenuItems: result.artifacts.menuItems.length > 0,
          hasCitations: result.artifacts.citations.length > 0,
        }),
        truncated: result.truncated,
      });
    }),
  );

  router.get(
    '/conversations/:id',
    requireAiAuth,
    asyncHandler(async (req, res) => {
      const user = toAiUser(req);
      const conversationId = String(req.params.id);
      const messages = await getConversationMessages(conversationId, user.id);
      res.json({
        conversationId,
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        })),
      });
    }),
  );

  router.post(
    '/actions/confirm',
    requireAiAuth,
    asyncHandler(async (req, res) => {
      const config = await configProvider();
      const limiter = confirmLimiterFor(config.limits.windowMs, config.limits.confirmMax);
      await new Promise<void>((resolve, reject) => {
        limiter(req, res, (error?: unknown) => (error ? reject(error) : resolve()));
      });
      if (res.headersSent) return;

      const body = validateBody(confirmBodySchema, req.body);
      const user = toAiUser(req);
      const result = await confirmDraft(body.draftId, user, {
        timeZone: config.restaurantTimeZone,
        maxPartySize: config.maxPartySize,
      });
      res.json(result);
    }),
  );

  const knowledgeRateLimit: RequestHandler = (req, res, next) => {
    configProvider()
      .then((config) => {
        const limiter = knowledgeLimiterFor(
          config.limits.windowMs,
          config.limits.adminMax,
        );
        limiter(req, res, next);
      })
      .catch(next);
  };

  router.get(
    '/knowledge',
    requireAiAdmin,
    knowledgeRateLimit,
    asyncHandler(async (_req, res) => {
      const runtime = await requireAiRuntime();
      if (!runtime.knowledge) {
        throw new AiError(
          AiErrorCodes.RAG_UNAVAILABLE,
          'The knowledge base is not configured.',
          503,
        );
      }
      const documents = await runtime.knowledge.listDocuments();
      res.json({
        documents: documents.map((document) => ({
          id: document.id,
          title: document.title,
          sourceType: document.sourceType,
          embeddingStatus: document.embeddingStatus,
          chunkCount: document.chunkCount,
          updatedAt: document.updatedAt,
        })),
      });
    }),
  );

  router.get(
    '/knowledge/:id',
    requireAiAdmin,
    knowledgeRateLimit,
    asyncHandler(async (req, res) => {
      const runtime = await requireAiRuntime();
      if (!runtime.knowledge) {
        throw new AiError(
          AiErrorCodes.RAG_UNAVAILABLE,
          'The knowledge base is not configured.',
          503,
        );
      }
      const document = await runtime.knowledge.getDocument(String(req.params.id));
      if (!document) throw new AiError(AiErrorCodes.NOT_FOUND, 'Knowledge document not found.', 404);
      res.json({ document });
    }),
  );

  router.post(
    '/knowledge',
    requireAiAdmin,
    knowledgeRateLimit,
    asyncHandler(async (req, res) => {
      const runtime = await requireAiRuntime();
      if (!runtime.knowledge) {
        throw new AiError(
          AiErrorCodes.RAG_UNAVAILABLE,
          'The knowledge base is not configured.',
          503,
        );
      }
      const body = validateBody(knowledgeBodySchema, req.body);
      const result = await runtime.knowledge.ingest(body);
      res.status(201).json(result);
    }),
  );

  router.put(
    '/knowledge/:id',
    requireAiAdmin,
    knowledgeRateLimit,
    asyncHandler(async (req, res) => {
      const runtime = await requireAiRuntime();
      if (!runtime.knowledge) {
        throw new AiError(
          AiErrorCodes.RAG_UNAVAILABLE,
          'The knowledge base is not configured.',
          503,
        );
      }
      const existing = await runtime.knowledge.getDocument(String(req.params.id));
      if (!existing) throw new AiError(AiErrorCodes.NOT_FOUND, 'Knowledge document not found.', 404);
      const body = validateBody(knowledgeBodySchema, req.body);
      const result = await runtime.knowledge.ingest({ id: existing.id, ...body });
      res.json(result);
    }),
  );

  router.delete(
    '/knowledge/:id',
    requireAiAdmin,
    knowledgeRateLimit,
    asyncHandler(async (req, res) => {
      const runtime = await requireAiRuntime();
      if (!runtime.knowledge) {
        throw new AiError(
          AiErrorCodes.RAG_UNAVAILABLE,
          'The knowledge base is not configured.',
          503,
        );
      }
      await runtime.knowledge.delete(String(req.params.id));
      res.json({ deleted: true });
    }),
  );

  router.post(
    '/knowledge/:id/reindex',
    requireAiAdmin,
    knowledgeRateLimit,
    asyncHandler(async (req, res) => {
      const runtime = await requireAiRuntime();
      if (!runtime.knowledge) {
        throw new AiError(
          AiErrorCodes.RAG_UNAVAILABLE,
          'The knowledge base is not configured.',
          503,
        );
      }
      const result = await runtime.knowledge.reindex(String(req.params.id));
      res.json(result);
    }),
  );

  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // The client may disconnect while a provider request is in flight. Never
    // attempt to write another response after that.
    if (res.writableEnded || res.destroyed) return;
    const payload = toSafeErrorPayload(error);
    const status = error instanceof AiError ? error.status : 500;
    if (status >= 500 && status !== 499) {
      console.error(`AI request failed: ${payload.code}`);
    }
    res.status(status).json({ error: payload });
  });

  return router;
};

// Lazily-created singleton limiters so the config-derived window/max stay
// consistent across requests without rebuilding state on every call.
let chatLimiter: { windowMs: number; max: number; handler: ReturnType<typeof createRateLimiter> } | null =
  null;
const chatLimiterFor = (windowMs: number, max: number) => {
  if (
    !chatLimiter ||
    chatLimiter.windowMs !== windowMs ||
    chatLimiter.max !== max
  ) {
    chatLimiter = {
      windowMs,
      max,
      handler: createRateLimiter({ windowMs, max, keyPrefix: 'ai-chat' }),
    };
  }
  return chatLimiter.handler;
};

let confirmLimiter: {
  windowMs: number;
  max: number;
  handler: ReturnType<typeof createRateLimiter>;
} | null = null;
const confirmLimiterFor = (windowMs: number, max: number) => {
  if (
    !confirmLimiter ||
    confirmLimiter.windowMs !== windowMs ||
    confirmLimiter.max !== max
  ) {
    confirmLimiter = {
      windowMs,
      max,
      handler: createRateLimiter({ windowMs, max, keyPrefix: 'ai-confirm' }),
    };
  }
  return confirmLimiter.handler;
};

let interpreterLimiter: {
  windowMs: number;
  max: number;
  handler: ReturnType<typeof createRateLimiter>;
} | null = null;
const interpreterLimiterFor = (windowMs: number, max: number) => {
  if (
    !interpreterLimiter ||
    interpreterLimiter.windowMs !== windowMs ||
    interpreterLimiter.max !== max
  ) {
    interpreterLimiter = {
      windowMs,
      max,
      handler: createRateLimiter({ windowMs, max, keyPrefix: 'ai-interpreter' }),
    };
  }
  return interpreterLimiter.handler;
};

let knowledgeLimiter: {
  windowMs: number;
  max: number;
  handler: ReturnType<typeof createRateLimiter>;
} | null = null;
const knowledgeLimiterFor = (windowMs: number, max: number) => {
  if (
    !knowledgeLimiter ||
    knowledgeLimiter.windowMs !== windowMs ||
    knowledgeLimiter.max !== max
  ) {
    knowledgeLimiter = {
      windowMs,
      max,
      handler: createRateLimiter({ windowMs, max, keyPrefix: 'ai-knowledge' }),
    };
  }
  return knowledgeLimiter.handler;
};
