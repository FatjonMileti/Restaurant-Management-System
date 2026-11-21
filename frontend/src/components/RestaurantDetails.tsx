import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
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
      className="flex items-center gap-2 md:gap-3 !text-white no-underline shrink-0"
    >
      {logoSrc ? (
        <Box
          component="img"
          src={logoSrc}
          alt={`${settings?.name || 'Restaurant'} logo`}
          className="w-9 h-9 md:w-8 md:h-8 rounded object-cover !bg-white shrink-0"
        />
      ) : (
        <RestaurantMenuIcon aria-label="Restaurant logo" sx={{ fontSize: { xs: 36, md: 30 } }} />
      )}
      <Box className="hidden md:block">
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
