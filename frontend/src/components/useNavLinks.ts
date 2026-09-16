import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';

export interface NavLink {
  label: string;
  path: string;
}

/** Shared navbar navigation state: role-gated links, active check, actions. */
export const useNavLinks = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNav = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks: NavLink[] = user
    ? [
        { label: 'Menu', path: '/menu' },
        ...(user.role === 'admin' ? [{ label: 'Dashboard', path: '/dashboard' }] : []),
        { label: 'Orders', path: '/orders' },
        { label: 'Reservations', path: '/reservations' },
        ...(user.role === 'admin' || user.role === 'staff'
          ? [{ label: 'Tables', path: '/tables' }]
          : []),
        ...(user.role === 'admin' ? [{ label: 'Settings', path: '/settings' }] : []),
      ]
    : [
        { label: 'Menu', path: '/menu' },
        { label: 'Login', path: '/login' },
        { label: 'Register', path: '/register' },
      ];

  return { user, navLinks, isActive, handleLogout, handleNav };
};
