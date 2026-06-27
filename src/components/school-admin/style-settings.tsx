import React from 'react';

interface StyleSettingsProps {
    primaryColor: string;
    onPrimaryChange: (color: string) => void;
    sidebarBgColor: string;
    onSidebarBgChange: (color: string) => void;
    sidebarTextColor: string;
    onSidebarTextChange: (color: string) => void;
    onReset: () => void;
}

const ColorInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
        <label htmlFor={`color-${label}`} className="text-sm font-medium text-gray-700">{label}</label>
        <div className="relative">
            <input
                id={`color-${label}`}
                type="color"
                value={value}
                onChange={onChange}
                className="w-10 h-10 p-0 border-none cursor-pointer"
                style={{ appearance: 'none', background: 'transparent' }}
            />
            <div className="absolute inset-0 rounded-md pointer-events-none" style={{ backgroundColor: value, border: '1px solid rgba(0,0,0,0.1)' }}></div>
        </div>
    </div>
);


const StyleSettings: React.FC<StyleSettingsProps> = ({
    primaryColor,
    onPrimaryChange,
    sidebarBgColor,
    onSidebarBgChange,
    sidebarTextColor,
    onSidebarTextChange,
    onReset,
}) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900">Theme & Style</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Customize the application's appearance to match your school's branding. Changes are saved automatically.
                </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <div>
                    <h4 className="font-medium text-gray-800">Primary Theme Color</h4>
                    <p className="text-sm text-gray-500 mb-2">Controls buttons, links, highlights, and focus rings.</p>
                    <ColorInput label="Primary Color" value={primaryColor} onChange={(e) => onPrimaryChange(e.target.value)} />
                </div>

                <div>
                    <h4 className="font-medium text-gray-800">Fees Module Sidebar</h4>
                    <p className="text-sm text-gray-500 mb-2">Customize the dark sidebar in the Fees Collection module.</p>
                    <div className="space-y-2">
                        <ColorInput label="Sidebar Background" value={sidebarBgColor} onChange={(e) => onSidebarBgChange(e.target.value)} />
                        <ColorInput label="Sidebar Text & Accent" value={sidebarTextColor} onChange={(e) => onSidebarTextChange(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="pt-6 border-t">
                <button
                    type="button"
                    onClick={onReset}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Reset to Defaults
                </button>
            </div>
        </div>
    );
};

export default StyleSettings;
