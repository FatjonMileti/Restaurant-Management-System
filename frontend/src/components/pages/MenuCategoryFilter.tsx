import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';
import Tabs from '../Tabs';

interface Props {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}

function MenuCategoryFilter({ categories, value, onChange }: Props) {
  return (
    <Box
      className="flex gap-2 mb-2 bg-gray-100 p-2 rounded items-center overflow-x-auto"
      sx={{ position: 'sticky', top: 114, zIndex: 9 }}
    >
      <Typography variant="body2" className="font-semibold shrink-0">
        Filter:
      </Typography>
      <Tabs
        tabs={[{ key: '', label: 'All' }, ...categories.map((c) => ({ key: c, label: c }))]}
        active={value}
        onChange={onChange}
        ariaLabel="Filter by category"
        className="flex gap-2"
      />
    </Box>
  );
}

export default memo(MenuCategoryFilter);
