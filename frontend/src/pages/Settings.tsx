import React, { useState, Suspense } from 'react';
import { Box, Typography } from '@mui/material';
import Tabs, { TabOption } from '../components/Tabs';

const UserSection = React.lazy(() => import('../components/pages/UserSection'));
const CategorySection = React.lazy(() => import('../components/pages/CategorySection'));
const RestaurantSection = React.lazy(() => import('../components/pages/RestaurantSection'));

type TabKey = 'restaurant' | 'users' | 'categories';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('restaurant');

  const tabs: TabOption<TabKey>[] = [
    { key: 'restaurant', label: 'Restaurant' },
    { key: 'users', label: 'Users' },
    { key: 'categories', label: 'Categories' },
  ];

  return (
    <Box>
      <Typography variant="h3" className="page-heading mb-3">
        Settings
      </Typography>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} ariaLabel="Settings sections" />

      <Suspense fallback={null}>
        {activeTab === 'restaurant' && <RestaurantSection />}
        {activeTab === 'users' && <UserSection />}
        {activeTab === 'categories' && <CategorySection />}
      </Suspense>
    </Box>
  );
}
