import React from 'react';
import { Box, Typography } from '@mui/material';
import { AiCitation } from '../../api/ai';

interface Props {
  citations: AiCitation[];
}

/** Source citations for answers grounded in the knowledge base. */
export default function CitationList({ citations }: Props) {
  if (citations.length === 0) return null;
  return (
    <Box component="section" aria-label="Sources" className="mt-3 border-t border-gray-200 pt-2">
      <Typography variant="caption" className="!font-semibold !text-gray-600">
        Sources
      </Typography>
      <ul className="list-disc pl-5 mt-1 space-y-1">
        {citations.map((citation) => (
          <li key={citation.chunkId} className="text-xs text-gray-600">
            <span className="font-medium">{citation.title}</span>
            <span className="text-gray-400"> · {citation.sourceType}</span>
            {citation.excerpt && <span className="block">{citation.excerpt}</span>}
          </li>
        ))}
      </ul>
    </Box>
  );
}
