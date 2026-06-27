'use client';

import { useState, useEffect } from 'react';
import { StaffFormConfig } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FieldConfigEditorProps {
    initialConfig?: StaffFormConfig[];
    onChange: (config: StaffFormConfig[]) => void;
}

// Default fields that are available for configuration
const DEFAULT_FIELDS: StaffFormConfig[] = [
    // Personal Details
    { id: 'husbandName', section: 'Personal', label: 'Husband Name', fieldName: 'husbandName', visible: true, required: false },
    { id: 'fatherName', section: 'Personal', label: 'Father Name', fieldName: 'fatherName', visible: true, required: false },
    { id: 'religion', section: 'Personal', label: 'Religion', fieldName: 'religion', visible: true, required: false },
    { id: 'category', section: 'Personal', label: 'Category', fieldName: 'category', visible: true, required: false },
    { id: 'maritalStatus', section: 'Personal', label: 'Marital Status', fieldName: 'maritalStatus', visible: true, required: false },

    // Address
    { id: 'pincode', section: 'Address', label: 'Pincode', fieldName: 'pincode', visible: true, required: false },
    { id: 'country', section: 'Address', label: 'Country', fieldName: 'country', visible: true, required: false },

    // Bank Details
    { id: 'bankDetails', section: 'Bank', label: 'Enable Bank Details Section', fieldName: 'bankDetails', visible: true, required: false },
    { id: 'panNo', section: 'Bank', label: 'PAN Number', fieldName: 'panNo', visible: true, required: false },
    { id: 'pfAccNo', section: 'Bank', label: 'PF Account Number', fieldName: 'pfAccNo', visible: true, required: false },
    { id: 'uanNo', section: 'Bank', label: 'UAN Number', fieldName: 'uanNo', visible: true, required: false },

    // Experience
    { id: 'experience', section: 'Experience', label: 'Enable Experience Section', fieldName: 'experience', visible: true, required: false },
];

export default function FieldConfigEditor({ initialConfig, onChange }: FieldConfigEditorProps) {
    const [config, setConfig] = useState<StaffFormConfig[]>([]);

    useEffect(() => {
        // Merge initial config with default fields to ensure all options are present
        const merged = DEFAULT_FIELDS.map(def => {
            const existing = initialConfig?.find(c => c.id === def.id);
            return existing || def;
        });
        setConfig(merged);
    }, [initialConfig]);

    const handleToggle = (id: string, field: 'visible' | 'required') => {
        const newConfig = config.map(item => {
            if (item.id === id) {
                return { ...item, [field]: !item[field] };
            }
            return item;
        });
        setConfig(newConfig);
        onChange(newConfig);
    };

    // Group by section
    const sections = Array.from(new Set(config.map(c => c.section)));

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Staff Form Configuration
            </h3>
            <p className="text-xs text-slate-500 mb-4">
                Customize which fields are visible and required for schools on this package.
            </p>

            <Accordion type="single" collapsible className="w-full">
                {sections.map(section => (
                    <AccordionItem key={section} value={section} className="border-b-0 mb-2">
                        <AccordionTrigger className="hover:no-underline py-2 px-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium">{section} Details</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 px-2">
                            <div className="space-y-2">
                                {config.filter(c => c.section === section).map(field => (
                                    <div key={field.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={field.visible}
                                                onCheckedChange={() => handleToggle(field.id, 'visible')}
                                            />
                                            <span className={`text-sm ${!field.visible && 'text-slate-400 line-through'}`}>
                                                {field.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">Required</span>
                                            <Checkbox
                                                checked={field.required}
                                                onCheckedChange={() => handleToggle(field.id, 'required')}
                                                disabled={!field.visible}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
