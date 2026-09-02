import React from 'react';
import { Paper, Typography } from '@mui/material';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}

const DashboardStatCard = React.memo(function DashboardStatCard({
  title,
  value,
  subtitle,
  color = '#0f3460',
  icon,
}: Props) {
  return (
    <Paper
      className="flex-1 p-5 rounded-xl text-white text-center flex flex-col justify-center min-w-[160px]"
      style={{ backgroundColor: color }}
    >
      <Typography variant="h6" className="text-sm font-semibold opacity-90">
        {title}
      </Typography>
      <Typography variant="h4" className="text-3xl font-bold mt-1">
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" className="text-xs opacity-80 mt-1">
          {subtitle}
        </Typography>
      )}
      {icon}
    </Paper>
  );
});

export default DashboardStatCard;
