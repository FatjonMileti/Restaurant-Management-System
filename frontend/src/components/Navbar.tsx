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
    <AppBar position="static" sx={{ bgcolor: '#1a1a2e', px: 4, py: 1 }}>
      <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
        <Box component={Link} to="/menu" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#fff', textDecoration: 'none' }}>
          {settings?.logo ? (
            <Box component="img" src={settings.logo} alt="logo" sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover', bgcolor: '#fff' }} />
          ) : null}
          <Box>
          <Typography variant="h6" sx={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>
            {settings?.name || 'Restaurant MS'}
          </Typography>
          {settings?.phone && <Typography variant="body2" sx={{ color: '#fff', opacity: 0.85, display: { xs: 'none', md: 'block' } }}>{settings.phone}</Typography>}
          </Box>

        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button component={Link} to="/menu" sx={{ color: '#fff', textDecoration: location.pathname === '/menu' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Menu</Button>
          
          {user ? (
            <>
              <Button component={Link} to="/dashboard" sx={{ color: '#fff', textDecoration: location.pathname === '/dashboard' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Dashboard</Button>
              <Button component={Link} to="/orders" sx={{ color: '#fff', textDecoration: location.pathname === '/orders' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Orders</Button>
              <Button component={Link} to="/reservations" sx={{ color: '#fff', textDecoration: location.pathname === '/reservations' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Reservations</Button>
              {(user.role === 'admin' || user.role === 'staff') && <Button component={Link} to="/tables" sx={{ color: '#fff', textDecoration: location.pathname === '/tables' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Tables</Button>}
              {user.role === 'admin' && <Button component={Link} to="/settings" sx={{ color: '#fff', textDecoration: location.pathname === '/settings' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Settings</Button>}
              <Typography sx={{ color: '#fff', mx: 1 }}>{user.name}</Typography>
              <Button onClick={handleLogout} variant="contained" sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#d63d54' } }}>Logout</Button>
            </>
          ) : (
            <>
              <Button component={Link} to="/login" sx={{ color: '#fff', textDecoration: location.pathname === '/login' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Login</Button>
              <Button component={Link} to="/register" sx={{ color: '#fff', textDecoration: location.pathname === '/register' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Register</Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
