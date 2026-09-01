import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import UserSection from '../components/pages/UserSection';
import CategorySection from '../components/pages/CategorySection';
import RestaurantSection from '../components/pages/RestaurantSection';

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

      {activeTab === 'restaurant' && <RestaurantSection />}
      {activeTab === 'users' && <UserSection />}
      {activeTab === 'categories' && <CategorySection />}
    </Box>
  );
}
