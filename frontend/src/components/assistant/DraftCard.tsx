import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Chip, Divider, Typography } from '@mui/material';
import {
  AiConfirmResponse,
  AiDraft,
  confirmAiDraft,
  errMessage,
  formatAiPrice,
} from '../../api/ai';

interface Props {
  draft: AiDraft;
  token?: string | null;
  onConfirmed?: (response: AiConfirmResponse) => void;
}

const formatExpiry = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ConfirmationSummary = ({ result }: { result: AiConfirmResponse }) => {
  if (result.kind === 'order') {
    const order = result.order;
    return (
      <Typography variant="body2" className="!mt-2 !text-green-700">
        Order confirmed{order?.id ? ` (#${order.id})` : ''}
        {order?.tableNumber ? ` for table ${order.tableNumber}` : ''}
        {typeof order?.totalAmount === 'number' ? ` · Total ${formatAiPrice(order.totalAmount)}` : ''}.
      </Typography>
    );
  }
  const reservation = result.reservation;
  return (
    <Typography variant="body2" className="!mt-2 !text-green-700">
      Reservation confirmed{reservation?.id ? ` (#${reservation.id})` : ''}
      {reservation?.date ? ` for ${reservation.date}` : ''}
      {reservation?.time ? ` at ${reservation.time}` : ''}
      {reservation?.guests ? ` · ${reservation.guests} guests` : ''}.
    </Typography>
  );
};

/** Review + explicit confirmation control for a server-validated draft. */
export default function DraftCard({ draft, token, onConfirmed }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AiConfirmResponse | null>(null);

  const expired = useMemo(() => {
    const expiry = new Date(draft.expiresAt).getTime();
    return Number.isFinite(expiry) && expiry <= Date.now();
  }, [draft.expiresAt]);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await confirmAiDraft(draft.draftId, token);
      setResult(response);
      onConfirmed?.(response);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const title = draft.kind === 'order' ? 'Order draft' : 'Reservation draft';
  const expiryLabel = formatExpiry(draft.expiresAt);

  return (
    <Box
      component="section"
      aria-label={title}
      className="mt-3 rounded-lg border border-[#e94560]/30 bg-[#fff7f8] p-3"
    >
      <Box className="flex items-center justify-between gap-2">
        <Typography component="h4" className="!font-semibold">
          {title}
        </Typography>
        <Chip size="small" color="warning" label="Needs confirmation" />
      </Box>
      <Typography variant="caption" className="block !text-gray-500">
        Nothing is submitted until you press Confirm.
        {expiryLabel ? ` This draft expires at ${expiryLabel}.` : ''}
      </Typography>

      {draft.kind === 'order' ? (
        <Box className="mt-2">
          <Typography variant="body2">
            Table <strong>{draft.tableNumber}</strong> · Payment:{' '}
            <strong>{draft.paymentMethod === 'card' ? 'Card' : 'Cash'}</strong>
          </Typography>
          <Divider className="!my-2" />
          <ul className="space-y-1" aria-label="Order items">
            {draft.items.map((item) => (
              <li key={item.menuItemId} className="flex justify-between gap-2 text-sm">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatAiPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <Divider className="!my-2" />
          <Typography variant="body2" className="text-right !font-semibold">
            Total: {formatAiPrice(draft.total)}
          </Typography>
        </Box>
      ) : (
        <Box className="mt-2 space-y-0.5">
          <Typography variant="body2">
            <strong>{draft.date}</strong> at <strong>{draft.time}</strong> · {draft.guests}{' '}
            {draft.guests === 1 ? 'guest' : 'guests'} · Table {draft.tableNumber}
          </Typography>
          <Typography variant="body2" className="!text-gray-600">
            {draft.contactName} · {draft.contactPhone} · {draft.contactEmail}
          </Typography>
          {draft.specialRequests && (
            <Typography variant="body2" className="!text-gray-600">
              Requests: {draft.specialRequests}
            </Typography>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" className="!mt-3" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {result ? (
        <Box role="status" aria-live="polite">
          <ConfirmationSummary result={result} />
        </Box>
      ) : !token ? (
        <Alert severity="info" className="!mt-3">
          <Link to="/login" className="underline font-medium">
            Log in
          </Link>{' '}
          to confirm this {draft.kind}.
        </Alert>
      ) : (
        <Box className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="contained"
            className="!bg-[#e94560] hover:!bg-[#d63d54] !normal-case"
            onClick={handleConfirm}
            disabled={submitting || expired}
            aria-label={`Confirm ${draft.kind} draft`}
          >
            {submitting ? 'Confirming…' : `Confirm ${draft.kind}`}
          </Button>
          {expired && (
            <Typography variant="body2" className="!text-red-600">
              This draft has expired. Ask the assistant for a new one.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
