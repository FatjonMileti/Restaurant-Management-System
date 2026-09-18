import React, { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import {
  ActivityLog,
  useActivityLogCount,
  useClearActivityLogs,
  useInfiniteActivityLogs,
} from '../api/queries';
import { getGraphQLErrorMessage } from '../utils/graphqlErrors';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import VirtualizedList from '../components/VirtualizedList';

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'order', label: 'Orders' },
  { value: 'reservation', label: 'Reservations' },
  { value: 'menuItem', label: 'Menu' },
  { value: 'category', label: 'Categories' },
  { value: 'user', label: 'Users' },
  { value: 'settings', label: 'Settings' },
  { value: 'auth', label: 'Auth' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'status', label: 'Status' },
  { value: 'delete', label: 'Deleted' },
  { value: 'login', label: 'Login' },
  { value: 'register', label: 'Register' },
];

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

function LogCard({ log }: { log: ActivityLog }) {
  return (
    <Box className="card">
      <Box className="flex items-center justify-between gap-2 flex-wrap">
        <Typography variant="subtitle1" className="!font-semibold">
          {log.summary}
        </Typography>
        <StatusBadge status={`${log.entity}:${log.action}`} />
      </Box>
      <Typography variant="body2" className="!text-gray-500 mt-1">
        {log.actorName ?? 'System'}
        {log.actorRole ? ` (${log.actorRole})` : ''} · {formatTime(log.createdAt)}
        {log.entityId ? ` · ${log.entity} ${log.entityId.slice(0, 8)}` : ''}
      </Typography>
    </Box>
  );
}

export default function Logs() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearError, setClearError] = useState('');

  // Debounce the free-text search so each keystroke doesn't fire a GraphQL
  // request — the input stays responsive while queries run on the settled value.
  const [debouncedSearch] = useDebounce(search, 500);

  const filters = useMemo(
    () => ({
      entity: entity || undefined,
      action: action || undefined,
      search: debouncedSearch || undefined,
    }),
    [entity, action, debouncedSearch],
  );

  const { data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteActivityLogs(filters);
  const { data: total } = useActivityLogCount(filters);
  const clearLogs = useClearActivityLogs();

  const logs = useMemo(() => (data?.pages ?? []).flat(), [data]);

  const handleClear = async () => {
    setClearError('');
    try {
      await clearLogs.mutateAsync();
    } catch (err) {
      setClearError(getGraphQLErrorMessage(err, 'Failed to clear logs'));
    }
    setConfirmClear(false);
  };

  return (
    <Box>
      <PageHeader
        title="Activity Logs"
        action={
          <Button
            variant="contained"
            className="!bg-[#e94560] hover:!bg-[#d63d54] !text-white normal-case"
            onClick={() => setConfirmClear(true)}
          >
            Clear logs
          </Button>
        }
      />
      <Typography variant="body2" className="!text-gray-500 mb-2">
        Every create / update / status / delete and auth event across orders, reservations, menu,
        categories, users and settings.
        {typeof total === 'number' ? ` Showing ${logs.length} of ${total}.` : ''}
      </Typography>

      <FilterBar
        label="Filter logs:"
        theme="gray"
        options={ACTION_OPTIONS}
        value={action}
        onChange={setAction}
        inputPlaceholder="Search summary, actor…"
        inputValue={search}
        onInputChange={setSearch}
      />
      <Box className="filter-bar mt-2">
        <TextField
          select
          size="small"
          label="Entity"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          {ENTITY_OPTIONS.map((o) => (
            <MenuItem key={o.value || 'all'} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {(error || clearError) && (
        <p className="error-text mt-3">
          {error ? getGraphQLErrorMessage(error, 'Failed to load activity logs') : clearError}
        </p>
      )}
      {isLoading ? (
        <p className="text-gray-400 mt-5">Loading activity…</p>
      ) : (
        <Box className="mt-2">
          <VirtualizedList<ActivityLog>
            items={logs}
            estimateSize={96}
            keyOf={(log) => log._id}
            renderItem={(log) => <LogCard log={log} />}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => void fetchNextPage()}
            emptyMessage="No activity yet."
            maxHeight={720}
          />
        </Box>
      )}
      <ConfirmDialog
        open={confirmClear}
        title="Clear Activity Logs"
        message="Are you sure you want to permanently delete all activity logs?"
        onConfirm={() => void handleClear()}
        onCancel={() => setConfirmClear(false)}
      />
    </Box>
  );
}
