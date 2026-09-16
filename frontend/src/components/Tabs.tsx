import React from 'react';
import Tab from './Tab';

export interface TabOption<T extends string> {
  key: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabOption<T>[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
  ariaLabel?: string;
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = 'settings-tab-bar',
  ariaLabel,
}: TabsProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={className}>
      {tabs.map((t) => (
        <Tab key={t.key} active={active === t.key} onClick={() => onChange(t.key)}>
          {t.label}
        </Tab>
      ))}
    </div>
  );
}
