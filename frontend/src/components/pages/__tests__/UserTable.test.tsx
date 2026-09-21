import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserTable from '../UserTable';
import { useUsers } from '../../../api/queries';

jest.mock('../../../api/queries', () => ({
  useUsers: jest.fn(),
  useDeleteUser: jest.fn(),
  useUpdateUserRole: jest.fn(),
}));

const mockQueries = jest.requireMock('../../../api/queries') as any;

jest.mock('../../../store/authStore', () => ({
  useAuth: () => ({ user: { _id: 'admin1', name: 'Admin', role: 'admin' } }),
}));

const users = [
  { _id: 'u1', name: 'John', email: 'john@example.com', role: 'customer', phone: '111' },
  { _id: 'u2', name: 'Jane', email: 'jane@example.com', role: 'staff', phone: '222' },
];

const setup = () => {
  mockQueries.useUsers.mockReturnValue({ data: users });
  mockQueries.useDeleteUser.mockReturnValue({ mutateAsync: jest.fn() });
  mockQueries.useUpdateUserRole.mockReturnValue({ mutateAsync: jest.fn() });
};

describe('UserTable row click to edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onEditUser with the clicked row user', () => {
    setup();
    const onEditUser = jest.fn();
    render(<UserTable onEditUser={onEditUser} />);
    fireEvent.click(screen.getByText('John').closest('tr')!);
    expect(onEditUser).toHaveBeenCalledWith(users[0]);
  });

  it('does not open the editor when deleting (delete click is isolated)', () => {
    setup();
    const onEditUser = jest.fn();
    render(<UserTable onEditUser={onEditUser} />);
    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(onEditUser).not.toHaveBeenCalled();
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });
});
