import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Menu from '../Menu';
import * as queries from '../../api/queries';

jest.mock('../../store/authStore', () => ({
  useAuth: () => ({ user: { role: 'admin', _id: 'u1' } }),
}));

jest.mock('../../components/pages/MenuItemCard', () => (props: any) => <div data-testid="card">{props.item.name}</div>);
jest.mock('../../components/pages/MenuItemForm', () => () => <div>Form</div>);

const mockUseMenu = jest.spyOn(queries, 'useMenu');
const mockUseCategories = jest.spyOn(queries, 'useCategories');

describe('Menu page', () => {
  beforeEach(() => {
    mockUseMenu.mockReturnValue({ data: [], error: null, isLoading: false } as any);
    mockUseCategories.mockReturnValue({ data: [] } as any);
  });
  afterEach(() => jest.clearAllMocks());

  it('renders PageHeader and Add Item for admin', () => {
    render(<Menu />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('+ Add Item')).toBeInTheDocument();
  });

  it('filters by category', () => {
    mockUseMenu.mockReturnValue({
      data: [
        { _id: '1', name: 'Pizza', category: 'Food', price: 10, available: true },
        { _id: '2', name: 'Cola', category: 'Drinks', price: 2, available: true },
      ],
      error: null,
      isLoading: false,
    } as any);
    mockUseCategories.mockReturnValue({ data: [{ _id: 'c1', name: 'Food' }, { _id: 'c2', name: 'Drinks' }] } as any);
    render(<Menu />);
    expect(screen.getAllByTestId('card')).toHaveLength(2);
    // Change filter to Drinks
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Drinks' } });
    expect(screen.getByText('Cola')).toBeInTheDocument();
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument();
  });

  it('shows error on network failure', () => {
    mockUseMenu.mockReturnValue({ data: [], error: new TypeError('Failed to fetch'), isLoading: false } as any);
    render(<Menu />);
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });
});
