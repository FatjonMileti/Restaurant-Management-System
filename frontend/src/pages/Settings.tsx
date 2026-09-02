import React, { useState, Suspense } from 'react';
import { Box, Typography } from '@mui/material';

const UserSection = React.lazy(() => import('../components/pages/UserSection'));
const CategorySection = React.lazy(() => import('../components/pages/CategorySection'));
const RestaurantSection = React.lazy(() => import('../components/pages/RestaurantSection'));

type TabKey = 'restaurant' | 'users' | 'categories';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('restaurant');

  const tabBtn = (key: TabKey) =>
    `tab-btn ${activeTab === key ? 'tab-btn-active' : 'tab-btn-inactive'}`;

  return (
    <Box>
      <Typography variant="h3" className="page-heading mb-3">
        Settings
      </Typography>

      <Box className="settings-tab-bar">
        <button onClick={() => setActiveTab('restaurant')} className={tabBtn('restaurant')}>
          Restaurant
        </button>
        <button onClick={() => setActiveTab('users')} className={tabBtn('users')}>
          Users
        </button>
        <button onClick={() => setActiveTab('categories')} className={tabBtn('categories')}>
          Categories
        </button>
      </Box>

      <Suspense
        fallback={
          <Box className="loading-wrapper">
            <Box className="spinner" />
          </Box>
        }
      >
        {activeTab === 'restaurant' && <RestaurantSection />}
        {activeTab === 'users' && <UserSection />}
        {activeTab === 'categories' && <CategorySection />}
      </Suspense>
    </Box>
  );
}
