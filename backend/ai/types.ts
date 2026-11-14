export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  /** Optional provider output cap, used by the bounded translation path. */
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AssistantTurn {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason?: string;
}

export interface EmbeddingRequest {
  texts: string[];
  signal?: AbortSignal;
}

export interface LLMProvider {
  readonly chatModel: string;
  readonly embeddingModel: string | null;
  chat(request: ChatRequest): Promise<AssistantTurn>;
  embed(texts: string[], signal?: AbortSignal): Promise<number[][]>;
}

export type ToolAccess = 'public' | 'authenticated' | 'staff' | 'admin';

export interface AiUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  phone?: string;
}

export interface ToolContext {
  userId?: string;
  user?: AiUser;
  conversationId?: string;
  signal?: AbortSignal;
}

export interface ToolError {
  code: string;
  message: string;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ToolError;
}

export interface Citation {
  chunkId: string;
  documentId: string;
  title: string;
  sourceType: string;
  chunkIndex: number;
  excerpt: string;
  score: number;
}

export interface MenuItemArtifact {
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export interface AvailabilityArtifact {
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

export interface OrderDraftItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderDraftArtifact {
  kind: 'order';
  draftId: string;
  status: 'pending' | 'completed';
  expiresAt: string;
  tableNumber: number;
  paymentMethod: 'cash' | 'card';
  items: OrderDraftItem[];
  total: number;
  requiresConfirmation: true;
}

export interface ReservationDraftArtifact {
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

export type DraftArtifact = OrderDraftArtifact | ReservationDraftArtifact;

export interface ToolTrace {
  name: string;
  ok: boolean;
  durationMs: number;
  errorCode?: string;
}

export interface AgentArtifacts {
  menuItems: MenuItemArtifact[];
  citations: Citation[];
  draft: DraftArtifact | null;
  availability: AvailabilityArtifact | null;
}

export interface AgentResult {
  content: string;
  toolCalls: ToolTrace[];
  artifacts: AgentArtifacts;
  iterations: number;
  truncated: boolean;
}

export interface KnowledgeSearchData {
  query: string;
  results: Citation[];
  message?: string;
}

export interface MenuSearchData {
  items: MenuItemArtifact[];
  total: number;
  dietaryMetadataAvailable: false;
  filters: Record<string, unknown>;
}

export interface MenuItemDetailsData {
  item: MenuItemArtifact;
  dietaryMetadataAvailable: false;
  verifiedFields: string[];
}

export interface RestaurantInformationData {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  tableCount: number;
  currency: string;
  timeZone: string;
  note: string;
}

export interface OrderDraftToolData {
  draft: OrderDraftArtifact;
  note: string;
}

export interface ReservationDraftToolData {
  draft: ReservationDraftArtifact;
  availability: AvailabilityArtifact;
  note: string;
}
