import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Logs from '../Logs';
import {
  useInfiniteActivityLogs,
  useActivityLogCount,
  useClearActivityLogs,
} from '../../api/queries';

jest.mock('../../api/queries', () => ({
  useInfiniteActivityLogs: jest.fn(),
  useActivityLogCount: jest.fn(),
  useClearActivityLogs: jest.fn(),
}));

const mockQueries = jest.requireMock('../../api/queries') as any;

const log = (overrides: any = {}) => ({
  _id: 'log1',
  actorName: 'Admin',
  actorRole: 'admin',
  action: 'create',
  entity: 'order',
  entityId: 'o1',
  summary: 'Order for table 5 created',
  createdAt: '2024-01-01T12:00:00.000Z',
  ...overrides,
});

const setup = (logs: any[] = [log()]) => {
  mockQueries.useInfiniteActivityLogs.mockReturnValue({
    data: { pages: [logs] },
    error: null,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  });
  mockQueries.useActivityLogCount.mockReturnValue({ data: logs.length });
  mockQueries.useClearActivityLogs.mockReturnValue({ mutateAsync: jest.fn() });
};

describe('Logs page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders activity summaries', () => {
    setup();
    render(<Logs />);
    expect(screen.getByText('Activity Logs')).toBeInTheDocument();
    expect(screen.getByText('Order for table 5 created')).toBeInTheDocument();
  });

  it('shows empty state when no activity', () => {
    setup([]);
    render(<Logs />);
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });

  it('shows load error via shared extractor', () => {
    mockQueries.useInfiniteActivityLogs.mockReturnValue({
      data: undefined,
      error: new Error('boom'),
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockQueries.useActivityLogCount.mockReturnValue({ data: 0 });
    mockQueries.useClearActivityLogs.mockReturnValue({ mutateAsync: jest.fn() });
    render(<Logs />);
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('opens clear confirmation dialog', () => {
    setup();
    render(<Logs />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear logs' }));
    expect(screen.getByText('Clear Activity Logs')).toBeInTheDocument();
  });

  it('debounces the search input before querying', () => {
    jest.useFakeTimers();
    try {
      setup();
      render(<Logs />);
      const input = screen.getByPlaceholderText('Search summary, actor…');

      // Typing updates the input immediately but must not refetch yet.
      fireEvent.change(input, { target: { value: 'pizza' } });
      expect(input).toHaveValue('pizza');
      expect(mockQueries.useInfiniteActivityLogs).not.toHaveBeenCalledWith(
        expect.objectContaining({ search: 'pizza' }),
      );

      // Once the debounce delay elapses, the settled value reaches the query.
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(mockQueries.useInfiniteActivityLogs).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'pizza' }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
