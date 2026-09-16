import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavLinks } from './useNavLinks';

/** Mobile hamburger menu shown on small screens. */
export default function MobileHamburger() {
  const { user, navLinks, isActive, handleLogout, handleNav } = useNavLinks();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const closeAnd = (fn: () => void) => () => {
    fn();
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        aria-label="open navigation menu"
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
            onClick={closeAnd(() => handleNav(link.path))}
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
            <MenuItem onClick={closeAnd(handleLogout)} className="!text-[#e94560]">
              Logout
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}
