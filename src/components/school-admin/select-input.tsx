
import React from 'react';

interface SelectInputProps {
  label?: string;
  name: string;
  value: string;
  options: (string | { label: string; value: string })[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, name, value, options, onChange, required = false, placeholder, helpText, disabled = false, hideLabel = false }) => {
  // Defensive: Ensure options is an array to prevent rendering objects improperly
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div>
      {!hideLabel && label && (
        <label htmlFor={name} className="block text-[10px] font-black text-slate-950 uppercase tracking-widest mb-2">
          {label} {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full h-11 px-4 text-sm font-black border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50 disabled:cursor-not-allowed"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {safeOptions.map((option, index) => {
          const optLabel = typeof option === 'string' ? option : option.label;
          const optValue = typeof option === 'string' ? option : option.value;
          return (
            <option key={typeof option === 'string' ? option : option.value || index} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};

export default SelectInput;
