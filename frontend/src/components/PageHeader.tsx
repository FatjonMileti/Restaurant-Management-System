import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
  headingVariant?: 'h3' | 'h4' | 'h5';
}

export default function PageHeader({
  title,
  action,
  className = '',
  headingVariant = 'h4',
}: PageHeaderProps) {
  return (
    <Box className={`flex justify-between items-center mb-2 ${className}`.trim()}>
      <Typography variant={headingVariant} className="page-heading">
        {title}
      </Typography>
      {action ? <Box>{action}</Box> : null}
    </Box>
  );
}
