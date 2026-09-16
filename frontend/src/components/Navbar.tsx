import React from 'react';
import RestaurantDetails from './RestaurantDetails';
import DesktopNav from './DesktopNav';
import MobileHamburger from './MobileHamburger';
import { AppBar, Toolbar } from '@mui/material';

function Navbar() {
  return (
    <AppBar position="sticky" className="!bg-[#1a1a2e] !px-4 !py-1">
      <Toolbar disableGutters className="flex justify-between">
        <RestaurantDetails />
        <DesktopNav />
        <MobileHamburger />
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
