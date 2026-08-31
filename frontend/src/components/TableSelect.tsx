import React from 'react';
import { useRestaurantSettings, useTables } from '../api/queries';

interface TableSelectProps {
  value?: number | string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowEmpty?: boolean;
  showBusyLabel?: boolean;
}

export default function TableSelect({ value, onChange, placeholder = 'Select table', className = 'form-input-sm w-32', allowEmpty = true, showBusyLabel = false }: TableSelectProps) {
  const { data: settings } = useRestaurantSettings();
  const { data: tables = [] } = useTables();
  const count = settings?.tableCount || 10;

  const numbers = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <select
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {allowEmpty && <option value="">{placeholder}</option>}
      {numbers.map((n) => {
        const status = tables.find((t) => t.number === n);
        const isBusy = status?.isBusy;
        const label = isBusy && showBusyLabel ? `Table ${n} (Busy - ${status?.busyType})` : `Table ${n}${isBusy ? ' (Busy)' : ''}`;
        return (
          <option key={n} value={String(n)}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
