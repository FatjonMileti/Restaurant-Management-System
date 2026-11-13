import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Assistant from '../pages/Assistant';
import { useAuthStore } from '../store/authStore';
import { confirmAiDraft, getAiConversation, sendAiMessage } from '../api/ai';

jest.mock('../api/ai', () => {
  const actual = jest.requireActual('../api/ai');
  return {
    ...actual,
    sendAiMessage: jest.fn(),
    confirmAiDraft: jest.fn(),
    getAiConversation: jest.fn(),
  };
});

const sendMock = sendAiMessage as jest.MockedFunction<typeof sendAiMessage>;
const confirmMock = confirmAiDraft as jest.MockedFunction<typeof confirmAiDraft>;
const restoreMock = getAiConversation as jest.MockedFunction<typeof getAiConversation>;

const orderDraft = {
  kind: 'order' as const,
  draftId: 'draft-1',
  status: 'pending' as const,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  tableNumber: 3,
  paymentMethod: 'cash' as const,
  items: [
    { menuItemId: 'm1', name: 'Tomato Pasta', quantity: 2, unitPrice: 12.5, lineTotal: 25 },
  ],
  total: 25,
  requiresConfirmation: true as const,
};

const chatResponse = (overrides: Record<string, unknown> = {}) => ({
  conversationId: 'conversation-1',
  message: {
    role: 'assistant' as const,
    content: 'Here are the details you asked for.',
    createdAt: new Date().toISOString(),
  },
  toolCalls: [{ name: 'search_menu', ok: true, durationMs: 5 }],
  menuItems: [
    {
      menuItemId: 'm1',
      name: 'Tomato Pasta',
      description: 'House pasta',
      price: 12.5,
      category: 'main',
      image: 'pasta.jpg',
      available: true,
    },
  ],
  citations: [
    {
      chunkId: 'c1',
      documentId: 'd1',
      title: 'Reservation policy',
      sourceType: 'policy',
      chunkIndex: 0,
      excerpt: 'Reservations are held for 15 minutes.',
      score: 0.9,
    },
  ],
  draft: null,
  availability: null,
  suggestions: ['Can I start an order?'],
  truncated: false,
  ...overrides,
});

const renderAssistant = () =>
  render(
    <MemoryRouter>
      <Assistant />
    </MemoryRouter>,
  );

const signIn = () => {
  useAuthStore.setState({
    user: {
      _id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'customer',
      token: 'token-123',
    },
  });
};

describe('Assistant page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sends a message and renders grounded menu, citation and follow-up artifacts', async () => {
    sendMock.mockResolvedValue(chatResponse() as any);
    const user = userEvent.setup();
    renderAssistant();

    expect(screen.getByText(/how can i help/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/message the virtual waitress/i);
    await user.type(input, 'What pasta do you have?');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    expect(screen.getByText('What pasta do you have?')).toBeInTheDocument();
    expect(
      await screen.findByText('Here are the details you asked for.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Tomato Pasta')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /sources/i })).toBeInTheDocument();
    expect(screen.getByText('Reservation policy')).toBeInTheDocument();
    expect(screen.getByText('Checked the live menu')).toBeInTheDocument();
    expect(screen.getByText('Can I start an order?')).toBeInTheDocument();

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'What pasta do you have?',
        history: expect.arrayContaining([
          { role: 'user', content: 'What pasta do you have?' },
        ]),
      }),
      null,
    );
    expect(sessionStorage.getItem('ai-conversation:guest')).toBe('conversation-1');
  });

  it('shows an error and retries the same message without duplicating it', async () => {
    sendMock
      .mockRejectedValueOnce(new Error('The assistant is unavailable right now.'))
      .mockResolvedValueOnce(chatResponse() as any);
    const user = userEvent.setup();
    renderAssistant();

    await user.type(screen.getByLabelText(/message the virtual waitress/i), 'hello');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText('The assistant is unavailable right now.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(
      await screen.findByText('Here are the details you asked for.'),
    ).toBeInTheDocument();
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('hello')).toHaveLength(1);
  });

  it('confirms an order only after the explicit button click', async () => {
    signIn();
    sendMock.mockResolvedValue(chatResponse({ draft: orderDraft }) as any);
    confirmMock.mockResolvedValue({
      kind: 'order',
      status: 'completed',
      alreadyCompleted: false,
      order: { id: 'ai-draft-1', tableNumber: 3, totalAmount: 25 },
    } as any);

    const user = userEvent.setup();
    renderAssistant();

    await user.type(screen.getByLabelText(/message the virtual waitress/i), 'Order two pasta');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    const draftSection = await screen.findByRole('region', { name: /order draft/i });
    expect(within(draftSection).getByText(/nothing is submitted until you press confirm/i)).toBeInTheDocument();
    expect(within(draftSection).getByText(/Total:/i)).toHaveTextContent('$25.00');

    expect(confirmMock).not.toHaveBeenCalled();
    await user.click(within(draftSection).getByRole('button', { name: /confirm order draft/i }));

    expect(confirmMock).toHaveBeenCalledWith('draft-1', 'token-123');
    expect(await within(draftSection).findByText(/order confirmed/i)).toBeInTheDocument();
    expect(within(draftSection).getByText(/ai-draft-1/)).toBeInTheDocument();
  });

  it('requires a signed-in customer before confirmation', async () => {
    sendMock.mockResolvedValue(chatResponse({ draft: orderDraft }) as any);
    const user = userEvent.setup();
    renderAssistant();

    await user.type(screen.getByLabelText(/message the virtual waitress/i), 'Order pasta');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    const draftSection = await screen.findByRole('region', { name: /order draft/i });
    expect(within(draftSection).getByText(/log in/i)).toBeInTheDocument();
    expect(within(draftSection).queryByRole('button', { name: /confirm order draft/i })).toBeNull();
  });

  it('restores an authenticated conversation for the current tab', async () => {
    signIn();
    sessionStorage.setItem('ai-conversation:user-1', 'conversation-1');
    restoreMock.mockResolvedValue({
      conversationId: 'conversation-1',
      messages: [
        { id: 'm1', role: 'user', content: 'Earlier question', createdAt: '' },
        { id: 'm2', role: 'assistant', content: 'Earlier answer', createdAt: '' },
      ],
    });

    renderAssistant();

    expect(await screen.findByText('Earlier question')).toBeInTheDocument();
    expect(screen.getByText('Earlier answer')).toBeInTheDocument();
    expect(restoreMock).toHaveBeenCalledWith('conversation-1', 'token-123');
    await waitFor(() => expect(screen.queryByText(/restoring your conversation/i)).toBeNull());
  });
});
