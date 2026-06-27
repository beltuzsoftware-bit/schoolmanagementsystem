
import React, { useState } from 'react';

interface TextInputProps {
  label?: string; // Made optional as sometimes we render label outside
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  addon?: React.ReactNode;
  wrapperClassName?: string;
  hideLabelOnFocus?: boolean;
  inputClassName?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  helpText,
  disabled = false,
  addon,
  wrapperClassName = '',
  hideLabelOnFocus = false,
  inputClassName = '',
  onFocus
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const shouldShowLabel = label && !(hideLabelOnFocus && isFocused);

  return (
    <div className={wrapperClassName}>
      {shouldShowLabel && (
        <div className="flex justify-between items-center mb-2">
          <label htmlFor={name} className="block text-[10px] font-black text-slate-950 uppercase tracking-widest">
            {label} {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
          </label>
          {addon && <div className="flex-shrink-0">{addon}</div>}
        </div>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={(e) => {
          setIsFocused(true);
          if (e.target.value && /^(0+|New Location|New Address)$/i.test(e.target.value)) {
            const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (setValue) {
              setValue.call(e.target, '');
              e.target.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
              e.target.value = '';
            }
          }
          if (onFocus) onFocus(e);
        }}
        onBlur={() => setIsFocused(false)}
        required={required}
        placeholder={placeholder || (label ? `Enter ${label.toLowerCase()}` : '')}
        disabled={disabled}
        className={`w-full h-10 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-input rounded-md shadow-sm caret-[var(--ring)] focus:outline-none focus:border-ring focus:ring-2 focus:ring-[var(--ring)] transition disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed ${inputClassName}`}
      />
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};

export default TextInput;
