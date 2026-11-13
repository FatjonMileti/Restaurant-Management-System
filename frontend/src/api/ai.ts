/**
 * Client for the virtual waitress REST API (`/api/ai`).
 *
 * Provider credentials never reach the browser; this module only talks to the
 * restaurant backend. Writes happen exclusively through `confirmDraft`.
 */

export interface AiMenuItem {
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export interface AiCitation {
  chunkId: string;
  documentId: string;
  title: string;
  sourceType: string;
  chunkIndex: number;
  excerpt: string;
  score: number;
}

export interface AiAvailability {
  available: boolean;
  date: string;
  time: string;
  guests: number;
  timeZone: string;
  freeTables: number[];
  tableCount: number;
  capacityVerified: boolean;
  openingHoursVerified: boolean;
  notes: string[];
}

export interface AiOrderDraftItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AiOrderDraft {
  kind: 'order';
  draftId: string;
  status: 'pending' | 'completed';
  expiresAt: string;
  tableNumber: number;
  paymentMethod: 'cash' | 'card';
  items: AiOrderDraftItem[];
  total: number;
  requiresConfirmation: true;
}

export interface AiReservationDraft {
  kind: 'reservation';
  draftId: string;
  status: 'pending' | 'completed';
  expiresAt: string;
  date: string;
  time: string;
  guests: number;
  tableNumber: number;
  specialRequests?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  requiresConfirmation: true;
}

export type AiDraft = AiOrderDraft | AiReservationDraft;

export interface AiToolTrace {
  name: string;
  ok: boolean;
  durationMs: number;
  errorCode?: string;
}

export interface AiChatRequest {
  message: string;
  conversationId?: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AiChatResponse {
  conversationId: string | null;
  message: {
    role: 'assistant';
    content: string;
    createdAt: string;
  };
  toolCalls: AiToolTrace[];
  menuItems: AiMenuItem[];
  citations: AiCitation[];
  draft: AiDraft | null;
  availability: AiAvailability | null;
  suggestions: string[];
  truncated: boolean;
}

export interface AiConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AiConversationResponse {
  conversationId: string;
  messages: AiConversationMessage[];
}

export interface AiConfirmedOrder {
  id?: string;
  tableNumber?: number;
  totalAmount?: number;
  status?: string;
}

export interface AiConfirmedReservation {
  id?: string;
  date?: string;
  time?: string;
  guests?: number;
  tableNumber?: number;
  status?: string;
}

export interface AiConfirmResponse {
  kind: 'order' | 'reservation';
  status: 'completed';
  alreadyCompleted: boolean;
  order?: AiConfirmedOrder;
  reservation?: AiConfirmedReservation;
}

export class AiApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'AI_REQUEST_FAILED') {
    super(message);
    this.name = 'AiApiError';
    this.status = status;
    this.code = code;
  }
}

const resolveAiBase = (): string => {
  const raw = process.env.REACT_APP_AI_API_URL || '/api/ai';
  return new URL(raw, window.location.origin).toString().replace(/\/+$/, '');
};

const readError = async (response: Response): Promise<AiApiError> => {
  let message = `The assistant request failed (${response.status}).`;
  let code = 'AI_REQUEST_FAILED';
  try {
    const body = await response.json();
    if (body?.error?.message) message = body.error.message;
    if (body?.error?.code) code = body.error.code;
  } catch {
    // Non-JSON error body (proxy/gateway); keep the generic message.
  }
  if (response.status === 401) {
    message = message || 'Please log in to continue.';
  }
  return new AiApiError(message, response.status, code);
};

const requestJson = async <T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${resolveAiBase()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new AiApiError(
      'Could not reach the restaurant assistant. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
};

export const sendAiMessage = (
  payload: AiChatRequest,
  token?: string | null,
): Promise<AiChatResponse> =>
  requestJson<AiChatResponse>('/chat', { method: 'POST', body: payload, token });

export const confirmAiDraft = (
  draftId: string,
  token?: string | null,
): Promise<AiConfirmResponse> =>
  requestJson<AiConfirmResponse>('/actions/confirm', {
    method: 'POST',
    body: { draftId },
    token,
  });

export const getAiConversation = (
  conversationId: string,
  token?: string | null,
): Promise<AiConversationResponse> =>
  requestJson<AiConversationResponse>(`/conversations/${encodeURIComponent(conversationId)}`, {
    token,
  });

export const formatAiPrice = (value: number): string => `$${Number(value || 0).toFixed(2)}`;

export const errMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
