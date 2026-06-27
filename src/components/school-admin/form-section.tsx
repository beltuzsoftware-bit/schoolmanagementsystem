import React from 'react';

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
    gridCols?: 1 | 2 | 3 | 4;
    defaultOpen?: boolean;
    icon?: React.ReactNode;
    noGrid?: boolean;
    variant?: 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
}

const FormSection: React.FC<FormSectionProps> = ({ 
    title, 
    children, 
    gridCols = 2, 
    defaultOpen = false, 
    icon,
    noGrid = false,
    variant = 'indigo'
}) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    const variants = {
        indigo: { 
            bg: 'bg-indigo-600', 
            light: 'bg-indigo-100', 
            text: 'text-indigo-600', 
            shadow: 'shadow-indigo-100', 
            border: 'border-indigo-100',
            button: 'bg-indigo-600'
        },
        blue: { 
            bg: 'bg-blue-600', 
            light: 'bg-blue-100', 
            text: 'text-blue-600', 
            shadow: 'shadow-blue-100', 
            border: 'border-blue-100',
            button: 'bg-blue-600'
        },
        emerald: { 
            bg: 'bg-emerald-600', 
            light: 'bg-emerald-100', 
            text: 'text-emerald-600', 
            shadow: 'shadow-emerald-100', 
            border: 'border-emerald-100',
            button: 'bg-emerald-600'
        },
        amber: { 
            bg: 'bg-amber-500', 
            light: 'bg-amber-100', 
            text: 'text-amber-600', 
            shadow: 'shadow-amber-100', 
            border: 'border-amber-100',
            button: 'bg-amber-500'
        },
        rose: { 
            bg: 'bg-rose-500', 
            light: 'bg-rose-100', 
            text: 'text-rose-600', 
            shadow: 'shadow-rose-100', 
            border: 'border-rose-100',
            button: 'bg-rose-500'
        },
        violet: { 
            bg: 'bg-violet-600', 
            light: 'bg-violet-100', 
            text: 'text-violet-600', 
            shadow: 'shadow-violet-100', 
            border: 'border-violet-100',
            button: 'bg-violet-600'
        },
        slate: { 
            bg: 'bg-slate-700', 
            light: 'bg-slate-100', 
            text: 'text-slate-600', 
            shadow: 'shadow-slate-100', 
            border: 'border-slate-100',
            button: 'bg-slate-700'
        }
    };

    const color = variants[variant];

    const gridColsMap = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };

    const gridClass = `grid ${gridColsMap[gridCols]} gap-5`;

    return (
        <div className={`border rounded-[2.5rem] transition-all duration-300 shadow-sm overflow-hidden hover:shadow-md ${isOpen ? `${color.light} ${color.border}` : 'bg-white border-slate-200'}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center px-8 py-5 focus:outline-none transition-all duration-300 ${isOpen ? 'bg-white/40' : 'hover:bg-slate-50/50'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`h-11 w-11 rounded-2xl ${color.bg} flex items-center justify-center shrink-0 shadow-lg ${color.shadow}`}>
                        {icon && React.isValidElement(icon) ? (
                            React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5 text-white' })
                        ) : (
                            <div className="w-5 h-5 bg-white/20 rounded-full" />
                        )}
                    </div>
                    <div className="text-left">
                        <h3 className={`text-sm font-black uppercase tracking-widest leading-none ${isOpen ? color.text : 'text-slate-900'}`}>{title}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Section Configuration</p>
                    </div>
                </div>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ${isOpen ? `${color.button} text-white shadow-lg ${color.shadow}` : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </button>
            {isOpen && (
                <div className="px-7 pb-7 pt-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    {noGrid ? (
                        children
                    ) : (
                        <div className={gridClass}>
                            {children}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FormSection;
