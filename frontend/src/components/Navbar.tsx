import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useRestaurantSettings } from '../api/queries';
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

function Navbar() {
  const { user, logout } = useAuth();
  const { data: settings } = useRestaurantSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setAnchorEl(null);
  };

  const handleNav = (path: string) => {
    navigate(path);
    setAnchorEl(null);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = user
    ? [
        { label: 'Menu', path: '/menu' },
        { label: 'Dashboard', path: '/dashboard' },
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

  return (
    <AppBar position="sticky" className="!bg-[#1a1a2e] !px-4 !py-1">
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

        {/* Desktop nav */}
        <Box className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Button
              key={link.path}
              component={Link}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'nav-link-active' : ''}`}
            >
              {link.label}
            </Button>
          ))}
          {user && (
            <>
              <Typography className="!text-white mx-1">{user.name}</Typography>
              <Button
                onClick={handleLogout}
                variant="contained"
                className="!bg-[#e94560] hover:!bg-[#d63d54] !text-white normal-case"
              >
                Logout
              </Button>
            </>
          )}
        </Box>

        {/* Mobile hamburger */}
        <IconButton
          className="!text-white"
          sx={{ display: { xs: 'flex', md: 'none' } }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <MenuIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {navLinks.map((link) => (
            <MenuItem
              key={link.path}
              onClick={() => handleNav(link.path)}
              className={isActive(link.path) ? '!bg-gray-100' : ''}
            >
              {link.label}
            </MenuItem>
          ))}
          {user && (
            <>
              <MenuItem disabled>
                <Typography variant="body2" className="!text-gray-500">
                  {user.name}
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout} className="!text-[#e94560]">
                Logout
              </MenuItem>
            </>
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
