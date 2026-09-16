import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DesktopNav from '../DesktopNav';

const mockLogout = jest.fn();
let mockUser: any = null;

jest.mock('../../store/authStore', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderNav = (initialPath = '/menu') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <DesktopNav />
      <LocationProbe />
    </MemoryRouter>,
  );

describe('DesktopNav', () => {
  beforeEach(() => {
    mockUser = null;
    jest.clearAllMocks();
  });

  it('shows guest links when logged out', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'Menu' })).toHaveAttribute('href', '/menu');
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('marks the active link', () => {
    renderNav('/login');
    expect(screen.getByRole('link', { name: 'Login' }).className).toContain('nav-link-active');
    expect(screen.getByRole('link', { name: 'Menu' }).className).not.toContain('nav-link-active');
  });

  it('shows admin-only links for admins', () => {
    mockUser = { _id: 'u1', name: 'Admin', role: 'admin' };
    renderNav();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tables' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows Tables but not Dashboard/Settings for staff', () => {
    mockUser = { _id: 'u2', name: 'Sam', role: 'staff' };
    renderNav();
    expect(screen.getByRole('link', { name: 'Tables' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('logs out and navigates to login', () => {
    mockUser = { _id: 'u1', name: 'Admin', role: 'admin' };
    renderNav('/orders');
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(mockLogout).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});
