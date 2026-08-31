import React from 'react';
import { Box, Typography } from '@mui/material';
import UserSection from '../components/pages/UserSection';
import CategorySection from '../components/pages/CategorySection';
import RestaurantSection from '../components/pages/RestaurantSection';

export default function Settings() {
  return (
    <Box>
      <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 3 }}>Settings</Typography>
      <RestaurantSection />
      <Box sx={{ mt: 3 }}>
        <UserSection />
      </Box>
      <Box sx={{ mt: 3 }}>
        <CategorySection />
      </Box>
    </Box>
  );
}
