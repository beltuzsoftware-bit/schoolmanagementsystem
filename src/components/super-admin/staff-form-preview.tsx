import React from 'react';
import { StaffFormConfig, SectionConfig } from '@/types';
import { StaffRole } from '@/types/staff';
import {
    X, Plus, Eye, User, Landmark, Briefcase, MapPin,
    GraduationCap, Building2, KeyRound, Wallet,
    Percent, Trash2, CheckCircle2, ClipboardList, Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export default function StaffFormPreview({ config, sectionSettings = [] }: { config: StaffFormConfig[], sectionSettings?: SectionConfig[] }) {
    const shouldShow = (f: StaffFormConfig) => {
        if (!f.visible) return false;
        if (f.dependsOn) {
            const dependency = config.find(c => c.fieldName === f.dependsOn?.fieldName);
            if (!dependency || !dependency.visible) return false;
        }
        return true;
    };

    const getColumns = (sectionName: string) => {
        const setting = sectionSettings.find(s => s.sectionName === sectionName);
        return setting?.columns || 3;
    };

    const sections = Array.from(new Set(config.map(f => f.section)));

    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header Mirror */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Add Employee</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Registration Form Preview</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <X size={20} className="text-slate-300" />
                </div>
            </div>

            {/* Content Mirror */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 max-h-[70vh] scrollbar-hide">
                {sections.map(section => {
                    const sectionFields = config.filter(f => f.section === section && shouldShow(f));
                    if (sectionFields.length === 0) return null;

                    return (
                        <section key={section} className="animate-in slide-in-from-bottom-4 duration-500">
                            <SectionHeader
                                icon={getSectionIcon(section)}
                                title={`${section} Details:`}
                            />
                            <div className={`grid grid-cols-1 gap-6`} style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${getColumns(section)}, minmax(0, 1fr))`
                            }}>
                                {sectionFields.map(field => (
                                    <DynamicField key={field.id} field={field} />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Footer Mirror */}
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-between rounded-b-[2.5rem]">
                <div className="px-8 py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl font-bold text-sm cursor-not-allowed">Close</div>
                <div className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 opacity-50 cursor-not-allowed flex items-center gap-3">
                    Submit Registration <Badge className="bg-white/20 text-[8px] border-none font-black px-1.5 py-0">PREVIEW</Badge>
                </div>
            </div>
        </div>
    );
}

function getSectionIcon(section: string) {
    switch (section) {
        case 'Personal': return <User size={18} />;
        case 'Address': return <MapPin size={18} />;
        case 'Bank': return <Landmark size={18} />;
        case 'Experience': return <Briefcase size={18} />;
        case 'Documents': return <ClipboardList size={18} />;
        case 'Employment': return <Building2 size={18} />;
        case 'Salary': return <Wallet size={18} />;
        case 'Login': return <KeyRound size={18} />;
        default: return <Settings size={18} />;
    }
}

function DynamicField({ field }: { field: StaffFormConfig }) {
    const label = (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1 mb-1.5">
            {field.label} {field.required && <span className="text-indigo-500">*</span>}
            {field.id.startsWith('custom_') && <Badge className="h-3 px-1 text-[6px] bg-purple-50 text-purple-600 border-purple-200">CUSTOM</Badge>}
        </label>
    );

    const inputClasses = "w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-medium";

    const renderInput = () => {
        switch (field.fieldType) {
            case 'textarea':
                return <textarea disabled rows={2} className={inputClasses} placeholder={field.placeholder} />;
            case 'select':
                return (
                    <select disabled className={inputClasses}>
                        <option value="">{field.placeholder || `Select ${field.label}`}</option>
                        {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                );
            case 'toggle':
                return (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-400 font-medium">{field.label}</span>
                        <Switch disabled checked={false} className="data-[state=checked]:bg-indigo-600 scale-75 origin-right" />
                    </div>
                );
            case 'checkbox':
                return (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-5 h-5 rounded border border-slate-300 bg-white" />
                        <span className="text-xs text-slate-400 font-medium">{field.label}</span>
                    </div>
                );
            case 'date':
                return <input type="date" disabled className={inputClasses} />;
            default:
                return <input type="text" disabled className={inputClasses} placeholder={field.placeholder} />;
        }
    };

    return (
        <div className="flex flex-col gap-0.5">
            {label}
            {renderInput()}
            {field.helpText && <p className="text-[9px] text-slate-400 mt-1 ml-1">{field.helpText}</p>}
        </div>
    );
}

// Helper Components Mirroring AdvancedStaffForm
function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
    return (
        <div className="flex items-center gap-2 mb-6 text-slate-800 border-b border-slate-100 pb-2">
            <span className="text-indigo-600">{icon}</span>
            <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        </div>
    );
}

function InputField({ label, type = "text", value, disabled, required, placeholder }: any) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase">{label}</label>
            <input
                type={type}
                value={value || ''}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            {required && <span className="text-[10px] text-indigo-500 font-bold ml-1">REQUIRED FIELD</span>}
        </div>
    );
}

function SelectField({ label, options, value, disabled, required }: any) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase">{label}</label>
            <select
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            >
                <option value="">{value || 'Select Option'}</option>
            </select>
            {required && <span className="text-[10px] text-indigo-500 font-bold ml-1">REQUIRED FIELD</span>}
        </div>
    );
}
