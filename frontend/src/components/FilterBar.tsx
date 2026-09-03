import React from 'react';
import TableSelect from './TableSelect';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputType?: 'text' | 'number';
  theme?: 'blue' | 'gray';
  useTableSelect?: boolean;
}

export default function FilterBar({
  label,
  options,
  value,
  onChange,
  inputPlaceholder,
  inputValue,
  onInputChange,
  inputType = 'text',
  theme = 'gray',
  useTableSelect = false,
}: FilterBarProps) {
  const containerClass = theme === 'blue' ? 'filter-bar-blue' : 'filter-bar-gray';
  return (
    <div
      className={`filter-bar ${containerClass}`}
      style={{ position: 'sticky', top: 114, zIndex: 9 }}
    >
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input-sm w-36 !mb-0"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {inputPlaceholder !== undefined &&
        (useTableSelect ? (
          <TableSelect
            value={inputValue || ''}
            onChange={(v) => onInputChange?.(v)}
            placeholder={inputPlaceholder}
            className="form-input-sm w-32 !mb-0"
          />
        ) : (
          <input
            type={inputType}
            placeholder={inputPlaceholder}
            value={inputValue || ''}
            onChange={(e) => onInputChange?.(e.target.value)}
            className="form-input-sm w-28 !mb-0"
          />
        ))}
      {(value || inputValue) && (
        <button
          onClick={() => {
            onChange('');
            onInputChange?.('');
          }}
          className="btn-secondary text-xs"
        >
          Clear
        </button>
      )}
    </div>
  );
}
