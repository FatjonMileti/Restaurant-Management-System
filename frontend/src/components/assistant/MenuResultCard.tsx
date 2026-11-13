import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { AiMenuItem, formatAiPrice } from '../../api/ai';
import { useCachedImage } from '../../hooks/useCachedImage';

interface Props {
  item: AiMenuItem;
}

/** Compact menu card used inside assistant answers. */
export default function MenuResultCard({ item }: Props) {
  const imgSrc = useCachedImage(item.image, '/images/empty.jpg');
  return (
    <Box
      component="article"
      className={`card-grid !mb-0 ${item.available ? '' : 'opacity-60 grayscale'}`}
      aria-label={`${item.name}, ${formatAiPrice(item.price)}`}
    >
      <div className="w-full h-28 rounded-md overflow-hidden mb-2 bg-gray-100">
        <img
          src={imgSrc || '/images/empty.jpg'}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(event) => {
            (event.target as HTMLImageElement).src = '/images/empty.jpg';
          }}
        />
      </div>
      <Box className="flex items-start justify-between gap-2">
        <Typography component="h4" className="!font-semibold !text-base">
          {item.name}
        </Typography>
        {!item.available && <Chip size="small" label="Unavailable" />}
      </Box>
      {item.description && (
        <Typography variant="body2" className="!text-gray-600">
          {item.description}
        </Typography>
      )}
      <Typography variant="body2" className="!mt-1">
        <strong>{formatAiPrice(item.price)}</strong>{' '}
        <span className="text-gray-400">({item.category})</span>
      </Typography>
    </Box>
  );
}
