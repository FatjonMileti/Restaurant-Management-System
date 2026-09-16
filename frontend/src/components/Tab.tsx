import React from 'react';

interface TabProps {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export default function Tab({ active = false, onClick, children }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tab-btn ${active ? 'tab-btn-active' : 'tab-btn-inactive'}`}
    >
      {children}
    </button>
  );
}
