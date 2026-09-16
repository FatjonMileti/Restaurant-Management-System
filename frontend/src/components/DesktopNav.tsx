import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useNavLinks } from './useNavLinks';

/** Desktop nav links + user/logout shown on md+ screens. */
export default function DesktopNav() {
  const { user, navLinks, isActive, handleLogout } = useNavLinks();

  return (
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
  );
}
