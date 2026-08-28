import React, { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({ title, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
