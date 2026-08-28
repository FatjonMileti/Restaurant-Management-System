import React from 'react';
import { Box, Typography } from '@mui/material';
import UserSection from '../components/pages/UserSection';
import CategorySection from '../components/pages/CategorySection';

export default function Settings() {
  return (
    <Box>
      <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 3 }}>Settings</Typography>
      <UserSection />
      <CategorySection />
      {/*restorant details section */}
    </Box>
  );
}
