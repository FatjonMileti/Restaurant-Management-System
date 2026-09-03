import React, { memo } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}

function MenuCategoryFilter({ categories, value, onChange }: Props) {
  return (
    <Box
      className="flex gap-2 mb-2 bg-gray-100 p-2 rounded items-center"
      sx={{ position: 'sticky', top: 114, zIndex: 9 }}
    >
      <Typography variant="body2" className="font-semibold">
        Filter:
      </Typography>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input-sm w-40 mt-3"
      >
        <option value="">All</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {value && (
        <Button size="small" onClick={() => onChange('')}>
          Clear
        </Button>
      )}
    </Box>
  );
}

export default memo(MenuCategoryFilter);
