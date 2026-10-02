import { memo } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { TableStatus } from '../../api/queries';

interface Props {
  table: TableStatus;
  order?: { _id: string; status: string } | null;
  reservation?: { guests: number; time?: string } | null;
}

function TableCard({ table: t, order, reservation: res }: Props) {
  return (
    <motion.div
      className={`table-card ${t.isBusy ? 'table-card-busy' : 'table-card-free'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Typography variant="h6" className="font-bold">
        Table {t.number}
      </Typography>
      <Box
        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white ${t.isBusy ? 'bg-red-500' : 'bg-green-600'}`}
      >
        {t.isBusy ? `Busy (${t.busyType})` : 'Free'}
      </Box>
      {t.isBusy && (
        <Box className="mt-3 text-xs text-gray-600">
          {order && (
            <p>
              Order #{order._id.slice(-6).toUpperCase()} — {order.status}
            </p>
          )}
          {res && (
            <p>
              Reservation — {res.guests} guests {res.time && `at ${res.time}`}
            </p>
          )}
          {!order && !res && <p>Occupied</p>}
        </Box>
      )}
    </motion.div>
  );
}

export default memo(TableCard);
