
import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  labelOff?: string;
  labelOn?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, labelOff = 'Auto', labelOn = 'Manual' }) => {
  const handleToggle = () => {
    onChange(!enabled);
  };

  return (
    <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200 h-8">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${!enabled ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
      >
        {labelOff}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${enabled ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
      >
        {labelOn}
      </button>
    </div>
  );
};

export default ToggleSwitch;
