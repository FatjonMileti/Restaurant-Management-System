import React, { useState } from 'react';
import { useAuth } from '../store/authStore';
import UserSection from '../components/pages/UserSection';
import CategorySection from '../components/pages/CategorySection';

export default function Settings() {
  return (
    <div>
      <h2 className="page-title mb-5">Settings</h2>
      <UserSection />
      <CategorySection />
    </div>
  );
}
