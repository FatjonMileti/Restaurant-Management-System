import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useRestaurantSettings } from '../api/queries';
import { clearImageCache, useCachedImage } from '../hooks/useCachedImage';

/**
 * Restaurant brand block (logo + name/address/phone) shown on the left side
 * of the navbar. Links to the menu page and clears the client-side image
 * cache so menu photos and the logo are refetched fresh.
 */
export default function RestaurantDetails() {
  const { data: settings } = useRestaurantSettings();
  const logoSrc = useCachedImage(settings?.logo, '', settings?.updatedAt);

  return (
    <Box
      component={Link}
      to="/menu"
      onClick={clearImageCache}
      className="flex items-center gap-3 !text-white no-underline"
    >
      {logoSrc ? (
        <Box
          component="img"
          src={logoSrc}
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
  );
}
