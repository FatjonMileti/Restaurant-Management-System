import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import {
  AiAvailability,
  AiCitation,
  AiConfirmResponse,
  AiDraft,
  AiMenuItem,
  AiToolTrace,
  formatAiPrice,
} from '../../api/ai';
import CitationList from './CitationList';
import DraftCard from './DraftCard';
import MenuResultCard from './MenuResultCard';

export interface AssistantDisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  menuItems?: AiMenuItem[];
  citations?: AiCitation[];
  draft?: AiDraft | null;
  availability?: AiAvailability | null;
  toolCalls?: AiToolTrace[];
  suggestions?: string[];
  failed?: boolean;
}

interface Props {
  message: AssistantDisplayMessage;
  token?: string | null;
  onConfirmed?: (response: AiConfirmResponse) => void;
  onSuggestion?: (suggestion: string) => void;
}

const toolLabels: Record<string, string> = {
  search_menu: 'Checked the live menu',
  get_menu_item_details: 'Checked item details',
  check_reservation_availability: 'Checked table availability',
  get_restaurant_information: 'Checked restaurant details',
  search_restaurant_knowledge: 'Searched restaurant information',
  prepare_order_draft: 'Prepared an order draft',
  prepare_reservation_draft: 'Prepared a reservation draft',
};

const sameAvailability = (draft: AiDraft | null | undefined, availability: AiAvailability | null | undefined) =>
  Boolean(draft && draft.kind === 'reservation' && availability);

/** Renders one chat turn plus grounded artifacts returned by the backend. */
export default function AssistantMessage({
  message,
  token,
  onConfirmed,
  onSuggestion,
}: Props) {
  const isUser = message.role === 'user';
  const artifacts = !isUser;
  const showAvailability = artifacts && message.availability && !sameAvailability(message.draft, message.availability);

  return (
    <Box
      component="article"
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      aria-label={isUser ? 'Your message' : 'Assistant message'}
    >
      <Box
        className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-[#1a1a2e] text-white'
            : message.failed
              ? 'bg-red-50 border border-red-200 text-gray-900'
              : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        <Typography className="whitespace-pre-wrap break-words !text-[0.95rem]">
          {message.content}
        </Typography>

        {artifacts && (message.toolCalls?.length ?? 0) > 0 && (
          <Box className="mt-2 flex flex-wrap gap-1" aria-label="Assistant activity">
            {message.toolCalls!.map((call, index) => (
              <Chip
                key={`${call.name}-${index}`}
                size="small"
                variant="outlined"
                color={call.ok ? 'default' : 'error'}
                label={
                  call.ok
                    ? toolLabels[call.name] ?? 'Checked live data'
                    : (toolLabels[call.name] ?? 'A check') + ' failed'
                }
              />
            ))}
          </Box>
        )}

        {showAvailability && message.availability && (
          <Box
            component="section"
            aria-label="Availability"
            className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <Typography variant="body2" className="!font-semibold">
              {message.availability.available
                ? `Tables available for ${message.availability.guests} on ${message.availability.date} at ${message.availability.time}`
                : `No table available for ${message.availability.guests} on ${message.availability.date} at ${message.availability.time}`}
            </Typography>
            {message.availability.available && (
              <Typography variant="body2" className="!text-gray-600">
                Free tables: {message.availability.freeTables.join(', ') || 'none'}
              </Typography>
            )}
            <Typography variant="caption" className="block !text-gray-500 mt-1">
              {message.availability.notes.join(' ')}
            </Typography>
          </Box>
        )}

        {artifacts && (message.menuItems?.length ?? 0) > 0 && (
          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {message.menuItems!.map((item) => (
              <MenuResultCard key={item.menuItemId} item={item} />
            ))}
          </Box>
        )}

        {artifacts && message.draft && (
          <DraftCard draft={message.draft} token={token} onConfirmed={onConfirmed} />
        )}

        {artifacts && <CitationList citations={message.citations ?? []} />}

        {artifacts && (message.suggestions?.length ?? 0) > 0 && onSuggestion && (
          <Box className="mt-3 flex flex-wrap gap-2" aria-label="Suggested follow-ups">
            {message.suggestions!.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="text-xs rounded-full border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50"
                onClick={() => onSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export const formatOrderTotal = (total: number): string => formatAiPrice(total);
