import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import PageHeader from '../components/PageHeader';
import AssistantMessage, {
  AssistantDisplayMessage,
} from '../components/assistant/AssistantMessage';
import {
  AiConfirmResponse,
  AiDraft,
  errMessage,
  getAiConversation,
  sendAiMessage,
} from '../api/ai';
import { useAuth } from '../store/authStore';

const GUEST_SUGGESTIONS = [
  'What do you recommend for two people?',
  'Is a table available tomorrow at 7 PM?',
  'Do you have vegetarian options?',
];

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const conversationStorageKey = (userId?: string): string =>
  `ai-conversation:${userId ?? 'guest'}`;

const toDisplayMessages = (
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt?: string }>,
): AssistantDisplayMessage[] =>
  messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }));

/** Customer-facing chat with the virtual waitress. */
export default function Assistant() {
  const { user } = useAuth();
  const token = user?.token ?? null;
  const storageKey = useMemo(() => conversationStorageKey(user?._id), [user?._id]);

  const [messages, setMessages] = useState<AssistantDisplayMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [retryText, setRetryText] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Restore an authenticated customer's latest conversation for this tab.
  useEffect(() => {
    if (!user) return;
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;
    let cancelled = false;
    setRestoring(true);
    getAiConversation(stored, token)
      .then((conversation) => {
        if (cancelled) return;
        setConversationId(conversation.conversationId);
        setMessages(toDisplayMessages(conversation.messages));
      })
      .catch((restoreError) => {
        if (cancelled) return;
        sessionStorage.removeItem(storageKey);
        setError(errMessage(restoreError));
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-run only when the signed-in identity changes, not on every message.
  }, [user?._id, token, storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, restoring]);

  const requestReply = useCallback(
    async (text: string, historyMessages: AssistantDisplayMessage[], activeConversationId: string | null) => {
      setSending(true);
      setError('');
      setRetryText(null);
      try {
        const history = historyMessages
          .filter((message) => !message.failed)
          .slice(-10)
          .map((message) => ({ role: message.role, content: message.content }));
        const response = await sendAiMessage(
          {
            message: text,
            conversationId: activeConversationId ?? undefined,
            history,
          },
          token,
        );
        if (response.conversationId) {
          setConversationId(response.conversationId);
          sessionStorage.setItem(storageKey, response.conversationId);
        }
        setMessages((previous) => [
          ...previous,
          {
            id: newId(),
            role: 'assistant',
            content: response.message.content,
            createdAt: response.message.createdAt,
            menuItems: response.menuItems,
            citations: response.citations,
            draft: response.draft,
            availability: response.availability,
            toolCalls: response.toolCalls,
            suggestions: response.suggestions,
          },
        ]);
      } catch (requestError) {
        setError(errMessage(requestError));
        setRetryText(text);
      } finally {
        setSending(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [storageKey, token],
  );

  const handleSend = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text || sending) return;
      const userMessage: AssistantDisplayMessage = {
        id: newId(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setInput('');
      void requestReply(text, nextHistory, conversationId);
    },
    [conversationId, messages, requestReply, sending],
  );

  const handleRetry = useCallback(() => {
    if (!retryText || sending) return;
    void requestReply(retryText, messages, conversationId);
  }, [conversationId, messages, requestReply, retryText, sending]);

  const handleConfirmed = useCallback((response: AiConfirmResponse) => {
    void response;
    setMessages((previous) =>
      previous.map((message) => {
        if (!message.draft) return message;
        const completed: AiDraft = { ...message.draft, status: 'completed' };
        return { ...message, draft: completed };
      }),
    );
  }, []);

  const startNewConversation = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setMessages([]);
    setConversationId(null);
    setError('');
    setRetryText(null);
    setInput('');
    inputRef.current?.focus();
  }, [storageKey]);

  return (
    <Box className="flex flex-col">
      <PageHeader
        title="Virtual waitress"
        action={
          <Button onClick={startNewConversation} className="!normal-case" disabled={sending}>
            New conversation
          </Button>
        }
      />

      <Typography variant="body2" className="!text-gray-600 mb-2">
        Ask about the menu, restaurant information, or table availability. I can prepare an order or
        reservation, but nothing is submitted until you review it and press Confirm.
      </Typography>
      {!user && (
        <Alert severity="info" className="!mb-3">
          You can chat without an account.{' '}
          <Link to="/login" className="underline font-medium">
            Log in
          </Link>{' '}
          to place orders, reserve a table, and save your conversation.
        </Alert>
      )}

      <Box
        component="section"
        aria-label="Conversation"
        className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[45vh] max-h-[62vh] overflow-y-auto"
      >
        <Box role="log" aria-live="polite" aria-relevant="additions" className="space-y-3">
          {messages.length === 0 && !restoring && (
            <Box className="text-center py-8" aria-label="Welcome">
              <Typography className="!font-semibold !text-lg">How can I help?</Typography>
              <Typography variant="body2" className="!text-gray-600 mb-3">
                Here are a few things you can ask:
              </Typography>
              <Box className="flex flex-wrap justify-center gap-2">
                {GUEST_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="text-sm rounded-full border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-100"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </Box>
            </Box>
          )}

          {restoring && (
            <Typography role="status" variant="body2" className="!text-gray-500 text-center">
              Restoring your conversation…
            </Typography>
          )}

          {messages.map((message) => (
            <AssistantMessage
              key={message.id}
              message={message}
              token={token}
              onConfirmed={handleConfirmed}
              onSuggestion={handleSend}
            />
          ))}

          {sending && (
            <Typography role="status" variant="body2" className="!text-gray-500">
              The assistant is checking the restaurant’s live details…
            </Typography>
          )}
          <div ref={endRef} />
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          className="!mt-3"
          onClose={() => setError('')}
          action={
            retryText ? (
              <Button color="inherit" size="small" onClick={handleRetry} disabled={sending}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}

      <Box
        component="form"
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(input);
        }}
      >
        <TextField
          inputRef={inputRef}
          id="assistant-message"
          label="Message the virtual waitress"
          placeholder="Ask about the menu or a reservation…"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend(input);
            }
          }}
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          slotProps={{
            htmlInput: { maxLength: 20000, 'aria-describedby': 'assistant-input-hint' },
          }}
          disabled={sending}
        />
        <Button
          type="submit"
          variant="contained"
          className="!bg-[#e94560] hover:!bg-[#d63d54] !normal-case !py-3"
          disabled={sending || input.trim().length === 0}
        >
          Send
        </Button>
      </Box>
      <Typography id="assistant-input-hint" variant="caption" className="!text-gray-500 mt-1">
        Press Enter to send, Shift+Enter for a new line. Do not share payment card details in chat.
      </Typography>
    </Box>
  );
}
