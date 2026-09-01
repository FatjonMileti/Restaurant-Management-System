import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useRestaurantSettings } from '../api/queries';
import { AppBar, Toolbar, Button, Typography, Box } from '@mui/material';

function Navbar() {
  const { user, logout } = useAuth();
  const { data: settings } = useRestaurantSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static" className="!bg-[#1a1a2e] !px-4 !py-1">
      <Toolbar disableGutters className="flex justify-between">
        <Box
          component={Link}
          to="/menu"
          className="flex items-center gap-3 !text-white no-underline"
        >
          {settings?.logo ? (
            <Box
              component="img"
              src={settings.logo}
              alt="logo"
              className="w-8 h-8 rounded object-cover !bg-white"
            />
          ) : null}
          <Box>
            <Typography variant="h6" className="!text-white no-underline !font-bold">
              {settings?.name || 'Restaurant MS'}
            </Typography>
            {settings?.address && (
              <Typography variant="body2" className="!text-white opacity-85 hidden md:block">
                {settings.address}
              </Typography>
            )}
            {settings?.phone && (
              <Typography variant="body2" className="!text-white opacity-85 hidden md:block">
                {settings.phone}
              </Typography>
            )}
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          <Button
            component={Link}
            to="/menu"
            className={`nav-link ${location.pathname === '/menu' ? 'nav-link-active' : ''}`}
          >
            Menu
          </Button>

          {user ? (
            <>
              <Button
                component={Link}
                to="/dashboard"
                className={`nav-link ${location.pathname === '/dashboard' ? 'nav-link-active' : ''}`}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                to="/orders"
                className={`nav-link ${location.pathname === '/orders' ? 'nav-link-active' : ''}`}
              >
                Orders
              </Button>
              <Button
                component={Link}
                to="/reservations"
                className={`nav-link ${location.pathname === '/reservations' ? 'nav-link-active' : ''}`}
              >
                Reservations
              </Button>
              {(user.role === 'admin' || user.role === 'staff') && (
                <Button
                  component={Link}
                  to="/tables"
                  className={`nav-link ${location.pathname === '/tables' ? 'nav-link-active' : ''}`}
                >
                  Tables
                </Button>
              )}
              {user.role === 'admin' && (
                <Button
                  component={Link}
                  to="/settings"
                  className={`nav-link ${location.pathname === '/settings' ? 'nav-link-active' : ''}`}
                >
                  Settings
                </Button>
              )}
              <Typography className="!text-white mx-1">{user.name}</Typography>
              <Button
                onClick={handleLogout}
                variant="contained"
                className="!bg-[#e94560] hover:!bg-[#d63d54] !text-white normal-case"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                component={Link}
                to="/login"
                className={`nav-link ${location.pathname === '/login' ? 'nav-link-active' : ''}`}
              >
                Login
              </Button>
              <Button
                component={Link}
                to="/register"
                className={`nav-link ${location.pathname === '/register' ? 'nav-link-active' : ''}`}
              >
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
