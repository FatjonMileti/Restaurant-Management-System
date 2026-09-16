import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import MobileHamburger from '../MobileHamburger';

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
      <MobileHamburger />
      <LocationProbe />
    </MemoryRouter>,
  );

const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: 'open navigation menu' }));
  return screen.getByRole('menu');
};

describe('MobileHamburger', () => {
  beforeEach(() => {
    mockUser = null;
    jest.clearAllMocks();
  });

  it('opens the menu with guest links and navigates', () => {
    renderNav('/menu');
    const dialog = openMenu();
    expect(within(dialog).getByText('Login')).toBeInTheDocument();
    expect(within(dialog).getByText('Register')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText('Register'));
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
  });

  it('shows admin links for admins', () => {
    mockUser = { _id: 'u1', name: 'Admin', role: 'admin' };
    renderNav();
    const dialog = openMenu();
    expect(within(dialog).getByText('Dashboard')).toBeInTheDocument();
    expect(within(dialog).getByText('Settings')).toBeInTheDocument();
    expect(within(dialog).getByText('Admin')).toBeInTheDocument();
  });

  it('logs out from the mobile menu', () => {
    mockUser = { _id: 'u1', name: 'Admin', role: 'admin' };
    renderNav('/orders');
    const dialog = openMenu();
    fireEvent.click(within(dialog).getByText('Logout'));
    expect(mockLogout).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});
