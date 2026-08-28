import React, { ReactNode } from 'react';

interface ActionRowProps {
  children: ReactNode;
  align?: 'left' | 'right';
  gap?: string;
}

export default function ActionRow({ children, align = 'right', gap = 'gap-1.5' }: ActionRowProps) {
  return (
    <div className={`flex flex-col ${gap} items-${align === 'left' ? 'start' : 'end'}`}>
      {children}
    </div>
  );
}
