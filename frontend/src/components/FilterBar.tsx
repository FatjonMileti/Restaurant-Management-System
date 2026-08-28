import React from 'react';

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
}

export default function FilterBar({ label, options, value, onChange, inputPlaceholder, inputValue, onInputChange, inputType = 'text', theme = 'gray' }: FilterBarProps) {
  const containerClass = theme === 'blue' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200';
  return (
    <div className={`${containerClass} p-3 rounded-lg shadow-sm flex flex-wrap gap-3 mb-4 items-center`}>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input-sm w-36">
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {inputPlaceholder !== undefined && (
        <input type={inputType} placeholder={inputPlaceholder} value={inputValue || ''} onChange={(e) => onInputChange?.(e.target.value)} className="form-input-sm w-28" />
      )}
      {(value || inputValue) && (
        <button onClick={() => { onChange(''); onInputChange?.(''); }} className="btn-secondary text-xs">Clear</button>
      )}
    </div>
  );
}
