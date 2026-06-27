'use client';

import { useState, useRef, useEffect } from 'react';
import { IDCardTemplate, IDCardElementShape, IDCardCanvasElement } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, ArrowUp, ArrowDown, Upload, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getShapeStyle, SHAPE_OPTIONS } from '@/lib/id-card-utils';
import CanvasEditor from '@/components/super-admin/canvas-editor';
import { getDefaultCanvasElements } from '@/lib/canvas-engine';
import QRCode from 'react-qr-code';

interface EditorProps {
    template: IDCardTemplate;
    onSave: (template: IDCardTemplate) => void;
    onCancel: () => void;
}

// ---------- Preview dummy data ----------
const PREVIEW_STUDENT = {
    name: 'Aarav Sharma',
    className: 'Class 10 - A',
    rollNumber: '1023',
    dob: '12-05-2008',
    bloodGroup: 'B+',
    admissionNumber: 'ADM-2024-001',
    phone: '+91 9876543210',
    currentAddress: '123, Green Park, New Delhi',
    photo: 'https://github.com/shadcn.png',
    fatherName: 'Rajesh Sharma',
    motherName: 'Sunita Sharma',
    gender: 'Male',
    house: 'Tagore House',
};

const PRESET_GRADIENTS = [
    { name: 'None', value: '' },
    { name: 'Indigo Dream', value: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)' },
    { name: 'Sunrise Glow', value: 'linear-gradient(135deg,#f43f5e 0%,#fb7185 100%)' },
    { name: 'Ocean Breeze', value: 'linear-gradient(135deg,#0284c7 0%,#0ea5e9 100%)' },
    { name: 'Emerald Mesh', value: 'linear-gradient(135deg,#059669 0%,#34d399 100%)' },
    { name: 'Dark Midnight', value: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)' },
];

const ALL_FIELD_KEYS = [
    'name','className','rollNumber','admissionNumber','dob','bloodGroup',
    'currentAddress','phone','fatherName','motherName','gender','house',
];

// ---------- Inline shape picker mini-component ----------
function ShapePicker({
    value, onChange, className,
}: { value?: IDCardElementShape; onChange: (s: IDCardElementShape) => void; className?: string }) {
    return (
        <div className={`flex gap-1 ${className ?? ''}`}>
            {SHAPE_OPTIONS.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => onChange(opt.value)}
                    className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all font-bold
                        ${value === opt.value
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-500'}`}
                >
                    {opt.icon}
                </button>
            ))}
        </div>
    );
}

// ---------- Main Editor ----------
export default function IDCardTemplateEditor({ template: initialTemplate, onSave, onCancel }: EditorProps) {

    const filled: IDCardTemplate = {
        layoutMode: 'grid',
        textColor: '#1e293b',
        headerTextColor: '#ffffff',
        borderRadius: 'md',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        showSchoolHeader: true,
        photoPosition: { x: 35, y: 15, width: 28, height: 26, shape: 'circle', borderColor: '#6366f1', borderWidth: 2 },
        signaturePosition: { x: 70, y: 80, width: 20, height: 10, shape: 'rectangle' },
        ...initialTemplate,
    };

    if (filled.layoutMode === 'drag-drop' && (!filled.canvasElements || filled.canvasElements.length === 0)) {
        filled.canvasElements = getDefaultCanvasElements(filled.layout);
    }

    const [template, setTemplate] = useState<IDCardTemplate>(filled);
    const [activeTab, setActiveTab] = useState<'layout' | 'style' | 'content'>('layout');

    const isDragDrop = template.layoutMode === 'drag-drop';

    useEffect(() => {
        if (isDragDrop && activeTab === 'content') {
            setActiveTab('layout');
        }
    }, [isDragDrop, activeTab]);

    const [selectedEl, setSelectedEl] = useState<string | null>(null);   // field.id | 'photo' | 'signature'
    const cardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ----- helpers -----
    const set = (field: keyof IDCardTemplate, value: any) =>
        setTemplate(prev => ({ ...prev, [field]: value }));

    const setPhoto = (patch: Partial<typeof template.photoPosition>) =>
        setTemplate(prev => ({ ...prev, photoPosition: { ...(prev.photoPosition as any), ...patch } }));

    const setSig = (patch: Partial<typeof template.signaturePosition>) =>
        setTemplate(prev => ({ ...prev, signaturePosition: { ...(prev.signaturePosition as any), ...patch } }));

    const setField = (id: string, patch: Partial<IDCardTemplate['fields'][0]>) =>
        setTemplate(prev => ({
            ...prev,
            fields: prev.fields.map(f => f.id === id ? { ...f, ...patch } : f),
        }));

    const toggleField = (key: string) => {
        const exists = template.fields.find(f => f.key === key);
        if (exists) {
            setTemplate(prev => ({ ...prev, fields: prev.fields.filter(f => f.key !== key) }));
        } else {
            const idx = template.fields.length;
            setTemplate(prev => ({
                ...prev,
                fields: [...prev.fields, {
                    id: `f_${Date.now()}`,
                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
                    key,
                    bold: false,
                    x: template.layout === 'vertical' ? 10 : 36,
                    y: template.layout === 'vertical' ? 45 + idx * 9 : 18 + idx * 12,
                    fontSize: key === 'name' ? 14 : 10,
                    fontColor: template.textColor,
                }],
            }));
        }
    };

    const moveField = (idx: number, dir: 'up' | 'down') => {
        const next = dir === 'up' ? idx - 1 : idx + 1;
        if (next < 0 || next >= template.fields.length) return;
        const arr = [...template.fields];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        // swap Y too in drag-drop mode
        if (template.layoutMode === 'drag-drop') {
            [arr[idx].y, arr[next].y] = [arr[next].y, arr[idx].y];
        }
        setTemplate(prev => ({ ...prev, fields: arr }));
    };

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { set('backgroundImage', reader.result as string); toast.success('Background uploaded!'); };
        reader.readAsDataURL(file);
    };

    // Drag tracking
    const startDrag = (e: React.MouseEvent, elId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedEl(elId);
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY;

        let ix = 0, iy = 0;
        if (elId === 'photo')     { ix = template.photoPosition?.x ?? 35; iy = template.photoPosition?.y ?? 15; }
        else if (elId === 'sig')  { ix = template.signaturePosition?.x ?? 70; iy = template.signaturePosition?.y ?? 80; }
        else { const f = template.fields.find(f => f.id === elId); ix = f?.x ?? 10; iy = f?.y ?? 45; }

        const onMove = (ev: MouseEvent) => {
            const nx = Math.round(Math.min(100, Math.max(0, ix + ((ev.clientX - sx) / rect.width) * 100)));
            const ny = Math.round(Math.min(100, Math.max(0, iy + ((ev.clientY - sy) / rect.height) * 100)));
            if (elId === 'photo')    setPhoto({ x: nx, y: ny });
            else if (elId === 'sig') setSig({ x: nx, y: ny });
            else setField(elId, { x: nx, y: ny });
        };
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // Resize tracking (bottom-right corner handle on photo)
    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const iw = template.photoPosition?.width ?? 28;
        const ih = template.photoPosition?.height ?? 26;
        const sx = e.clientX, sy = e.clientY;
        const onMove = (ev: MouseEvent) => {
            const nw = Math.round(Math.min(80, Math.max(5, iw + ((ev.clientX - sx) / rect.width) * 100)));
            const nh = Math.round(Math.min(80, Math.max(5, ih + ((ev.clientY - sy) / rect.height) * 100)));
            setPhoto({ width: nw, height: nh });
        };
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const getVal = (key: string) => {
        if (key === 'address' || key === 'currentAddress') return PREVIEW_STUDENT.currentAddress;
        if (key === 'emergencyContact' || key === 'phone') return PREVIEW_STUDENT.phone;
        return (PREVIEW_STUDENT as any)[key] ?? 'N/A';
    };

    // ---------- render ----------
    if (isDragDrop) {
        return (
            <div className="w-full h-full overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
                <CanvasEditor
                    template={template}
                    onChange={setTemplate}
                    onSave={() => onSave(template)}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">

            {/* ── LEFT PANEL ── */}
            <div className={isDragDrop
                ? 'w-full lg:w-96 shrink-0 flex flex-col gap-4 overflow-y-auto pb-10 pr-1'
                : 'lg:col-span-5 flex flex-col gap-4 overflow-y-auto pb-10 pr-1'}>

                {/* Tabs */}
                <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit border">
                    {['layout','style', !isDragDrop && 'content'].filter(Boolean).map(tab => (
                        <button key={tab as string} onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                                ${activeTab === tab ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-5">

                    {/* ─── LAYOUT TAB ─── */}
                    {activeTab === 'layout' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                            <Field label="Template Name">
                                <Input value={template.name} onChange={e => set('name', e.target.value)} className="rounded-xl" />
                            </Field>
                            <Field label="Layout Engine">
                                <Select value={template.layoutMode} onValueChange={v => {
                                    setTemplate(prev => {
                                        const next = { ...prev, layoutMode: v as any };
                                        if (v === 'drag-drop' && (!next.canvasElements || next.canvasElements.length === 0)) {
                                            next.canvasElements = getDefaultCanvasElements(next.layout);
                                        }
                                        return next;
                                    });
                                }}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="grid">Standard Autogrid</SelectItem>
                                        <SelectItem value="drag-drop">Visual Drag & Drop Designer</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-slate-400 italic">In Drag & Drop mode you position every element freely over your background.</p>
                            </Field>
                            <Field label="Orientation">
                                <Select value={template.layout} onValueChange={v => set('layout', v)}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vertical">Vertical (Portrait)</SelectItem>
                                        <SelectItem value="horizontal">Horizontal (Landscape)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Width (mm)"><Input type="number" value={template.width} onChange={e => set('width', +e.target.value)} className="rounded-xl" /></Field>
                                <Field label="Height (mm)"><Input type="number" value={template.height} onChange={e => set('height', +e.target.value)} className="rounded-xl" /></Field>
                            </div>
                        </div>
                    )}

                    {/* ─── STYLE TAB ─── */}
                    {activeTab === 'style' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-left-4">

                            {/* Background presets */}
                            <Field label="Background Design">
                                <div className="grid grid-cols-3 gap-2">
                                    {PRESET_GRADIENTS.map(g => (
                                        <button key={g.name} type="button" onClick={() => set('backgroundImage', g.value)}
                                            className={`h-14 relative border rounded-xl text-[10px] font-bold overflow-hidden text-left p-2 flex flex-col justify-end
                                                ${template.backgroundImage === g.value ? 'ring-2 ring-indigo-500 border-transparent' : 'border-slate-200 hover:border-indigo-300'}`}>
                                            {g.value && <div className="absolute inset-0 opacity-80" style={{ background: g.value }} />}
                                            <span className="relative z-10 text-slate-800 drop-shadow">{g.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <div onClick={() => fileInputRef.current?.click()}
                                    className="mt-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all bg-slate-50 hover:bg-indigo-50/20">
                                    <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                                    <span className="text-xs font-bold text-slate-600">Upload custom background template</span>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                                </div>
                                {template.backgroundImage && !template.backgroundImage.startsWith('linear-gradient') && (
                                    <div className="flex justify-between items-center bg-slate-100 rounded-xl px-3 py-1.5 text-xs mt-1">
                                        <span className="text-slate-500 font-bold">Custom background applied ✓</span>
                                        <Button variant="ghost" size="sm" className="h-6 text-rose-500" onClick={() => set('backgroundImage', '')}>Clear</Button>
                                    </div>
                                )}
                            </Field>

                            {/* Color pickers */}
                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <ColorField label="Primary" color={template.primaryColor} onChange={c => set('primaryColor', c)} />
                                <ColorField label="Secondary" color={template.secondaryColor} onChange={c => set('secondaryColor', c)} />
                                <ColorField label="Header Text" color={template.headerTextColor!} onChange={c => set('headerTextColor', c)} />
                                <ColorField label="Body Text" color={template.textColor!} onChange={c => set('textColor', c)} />
                            </div>

                            {/* Font + corner style */}
                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <Field label="Font Family">
                                    <Select value={template.fontFamily} onValueChange={v => set('fontFamily', v)}>
                                        <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['Inter','Cinzel','Alice','sans-serif'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Card Corners">
                                    <Select value={template.borderRadius} onValueChange={v => set('borderRadius', v)}>
                                        <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(['none','sm','md','lg','full'] as const).map(r =>
                                                <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Border Width (px)">
                                    <Input type="number" min={0} max={10} value={template.borderWidth ?? 1} onChange={e => set('borderWidth', +e.target.value)} className="rounded-xl" />
                                </Field>
                                <ColorField label="Border Color" color={template.borderColor!} onChange={c => set('borderColor', c)} />
                            </div>

                            {/* ─── Photo Style ─── */}
                            {!isDragDrop && (
                                <>
                                    <div className="border-t pt-4 space-y-3">
                                        <Label className="font-black text-xs uppercase tracking-widest text-indigo-600">Student Photo</Label>
                                        <ShapePicker
                                            value={template.photoPosition?.shape}
                                            onChange={s => setPhoto({ shape: s })}
                                        />

                                        {/* W slider */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Width</label>
                                                <span className="text-xs font-black text-indigo-600">{template.photoPosition?.width ?? 28}%</span>
                                            </div>
                                            <input type="range" min={5} max={80} value={template.photoPosition?.width ?? 28}
                                                onChange={e => setPhoto({ width: +e.target.value })}
                                                className="w-full h-2 rounded-full accent-indigo-600 cursor-pointer" />
                                        </div>

                                        {/* H slider */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Height</label>
                                                <span className="text-xs font-black text-indigo-600">{template.photoPosition?.height ?? 26}%</span>
                                            </div>
                                            <input type="range" min={5} max={80} value={template.photoPosition?.height ?? 26}
                                                onChange={e => setPhoto({ height: +e.target.value })}
                                                className="w-full h-2 rounded-full accent-indigo-600 cursor-pointer" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <ColorField label="Photo Border" color={template.photoPosition?.borderColor ?? '#6366f1'} onChange={c => setPhoto({ borderColor: c })} />
                                            <Field label="Border Width">
                                                <Input type="number" min={0} max={8} value={template.photoPosition?.borderWidth ?? 2}
                                                    onChange={e => setPhoto({ borderWidth: +e.target.value })} className="rounded-xl" />
                                            </Field>
                                        </div>
                                    </div>

                                    {/* ─── Signature Shape ─── */}
                                    <div className="border-t pt-4 space-y-3">
                                        <Label className="font-black text-xs uppercase tracking-widest text-indigo-600">Signature Box Shape</Label>
                                        <ShapePicker value={template.signaturePosition?.shape} onChange={s => setSig({ shape: s })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Width (%)">
                                                <Input type="number" min={5} max={60} value={template.signaturePosition?.width ?? 20}
                                                    onChange={e => setSig({ width: +e.target.value })} className="rounded-xl" />
                                            </Field>
                                            <Field label="Height (%)">
                                                <Input type="number" min={5} max={40} value={template.signaturePosition?.height ?? 10}
                                                    onChange={e => setSig({ height: +e.target.value })} className="rounded-xl" />
                                            </Field>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ─── CONTENT TAB ─── */}
                    {activeTab === 'content' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                            <ToggleRow label="Show School Header & Logo" sub="Turn off if already pre-printed in background"
                                checked={template.showSchoolHeader !== false} onChange={c => set('showSchoolHeader', c)} />
                            <ToggleRow label="Show Student Photo" checked={template.showPhoto} onChange={c => set('showPhoto', c)} />
                            <ToggleRow label="Show Logo Graphic" checked={template.showLogo} onChange={c => set('showLogo', c)} />
                            <ToggleRow label="Show Student QR Code" sub="Unique QR code encoding student admission/ID"
                                checked={template.showQRCode ?? false} onChange={c => set('showQRCode', c)} />

                            {/* Field selector grid */}
                            <Field label="Active Student Fields">
                                <div className="grid grid-cols-3 gap-1.5">
                                    {ALL_FIELD_KEYS.map(key => {
                                        const selected = template.fields.some(f => f.key === key);
                                        return (
                                            <button key={key} type="button" onClick={() => toggleField(key)}
                                                className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold text-center cursor-pointer transition-all
                                                    ${selected ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            {/* Per-field editor */}
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 border-t pt-3">
                                <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Edit Each Field</Label>
                                {template.fields.map((field, idx) => (
                                    <div key={field.id}
                                        onClick={() => setSelectedEl(field.id)}
                                        className={`p-3 border rounded-2xl space-y-2.5 cursor-pointer transition-all
                                            ${selectedEl === field.id ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50/30' : 'hover:bg-slate-50'}`}>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-700 capitalize">
                                                {field.key.replace(/([A-Z])/g, ' $1')}
                                            </span>
                                            <div className="flex gap-1">
                                                <IconBtn onClick={() => moveField(idx,'up')} disabled={idx===0} title="Move up"><ArrowUp className="h-3 w-3"/></IconBtn>
                                                <IconBtn onClick={() => moveField(idx,'down')} disabled={idx===template.fields.length-1} title="Move down"><ArrowDown className="h-3 w-3"/></IconBtn>
                                                <IconBtn onClick={() => toggleField(field.key)} className="text-rose-400" title="Remove"><Trash2 className="h-3 w-3"/></IconBtn>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <MiniField label="Custom Label">
                                                <Input value={field.label} onChange={e => setField(field.id, { label: e.target.value })} className="h-7 text-xs rounded-lg" />
                                            </MiniField>
                                            <MiniField label="Font Size (px)">
                                                <Input type="number" value={field.fontSize ?? 10} onChange={e => setField(field.id, { fontSize: +e.target.value })} className="h-7 text-xs rounded-lg" />
                                            </MiniField>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Switch checked={field.bold} onCheckedChange={v => setField(field.id, { bold: v })} />
                                            <span className="text-xs text-slate-600 font-bold">{field.bold ? 'Bold' : 'Normal weight'}</span>
                                        </div>

                                        {/* Coordinates in drag-drop mode */}
                                        {template.layoutMode === 'drag-drop' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <MiniField label="X (%)">
                                                    <Input type="number" min={0} max={100} value={field.x ?? 10} onChange={e => setField(field.id, { x: +e.target.value })} className="h-7 text-xs rounded-lg" />
                                                </MiniField>
                                                <MiniField label="Y (%)">
                                                    <Input type="number" min={0} max={100} value={field.y ?? 45} onChange={e => setField(field.id, { y: +e.target.value })} className="h-7 text-xs rounded-lg" />
                                                </MiniField>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Signature label */}
                            <Field label="Signature Label">
                                <Input value={template.signatureText} onChange={e => set('signatureText', e.target.value)} className="rounded-xl" />
                            </Field>
                            {template.layoutMode === 'drag-drop' && (
                                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
                                    <MiniField label="Sig X (%)">
                                        <Input type="number" value={template.signaturePosition?.x ?? 70} onChange={e => setSig({ x: +e.target.value })} className="h-7 rounded-lg" />
                                    </MiniField>
                                    <MiniField label="Sig Y (%)">
                                        <Input type="number" value={template.signaturePosition?.y ?? 80} onChange={e => setSig({ y: +e.target.value })} className="h-7 rounded-lg" />
                                    </MiniField>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button onClick={() => onSave(template)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-bold text-white shadow-lg shadow-indigo-100">Save Template</Button>
                    <Button onClick={onCancel} variant="outline" className="flex-1 h-12 rounded-2xl">Cancel</Button>
                </div>
            </div>

            {/* ── RIGHT PANEL — Static Preview (grid) ── */}
            <div className="lg:col-span-7 bg-slate-100/60 rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-start gap-4 relative overflow-auto">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />

                <div className="flex items-center gap-2 z-10 bg-white/80 backdrop-blur px-4 py-1.5 rounded-full border shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Preview</span>
                    {template.layoutMode === 'drag-drop' && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full flex gap-1 items-center">
                            <Info size={10} /> Drag elements to reposition
                        </span>
                    )}
                </div>

                {/* Card Shell */}
                <div
                    ref={cardRef}
                    className="relative border flex flex-col shadow-2xl overflow-hidden select-none z-10"
                    style={{
                        width:  template.layout === 'vertical' ? '320px' : '500px',
                        aspectRatio: `${template.width}/${template.height}`,
                        fontFamily: template.fontFamily,
                        backgroundColor: template.secondaryColor,
                        color: template.textColor ?? '#1e293b',
                        borderColor: template.borderColor ?? '#cbd5e1',
                        borderWidth: `${template.borderWidth ?? 1}px`,
                        borderRadius: cardBorderRadiusCss(template.borderRadius),
                        backgroundImage: template.backgroundImage?.startsWith('linear-gradient') ? template.backgroundImage : undefined,
                    }}
                >
                    {/* BG image */}
                    {template.backgroundImage && !template.backgroundImage.startsWith('linear-gradient') && (
                        <div className="absolute inset-0 bg-cover bg-center pointer-events-none"
                            style={{ backgroundImage: `url(${template.backgroundImage})` }} />
                    )}

                    {/* Header overlay */}
                    {template.showSchoolHeader !== false && (
                        <div className="flex items-center gap-3 px-4 h-[22%] relative z-10 shrink-0"
                            style={{ backgroundColor: template.backgroundImage ? 'transparent' : template.primaryColor }}>
                            {template.showLogo && <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg">🏫</div>}
                            <div>
                                <p className="text-sm font-black uppercase tracking-wide" style={{ color: template.headerTextColor }}>Heritage Model School</p>
                                <p className="text-[8px] opacity-80" style={{ color: template.headerTextColor }}>Excellence in Education</p>
                            </div>
                        </div>
                    )}

                    {/* Layout modes */}
                    {template.layoutMode === 'drag-drop' ? (
                        <div className="flex-1 relative z-10">

                            {/* Draggable Photo */}
                            {template.showPhoto && (() => {
                                const pp = template.photoPosition!;
                                const shapeStyle = getShapeStyle(pp.shape);
                                const isSelected = selectedEl === 'photo';
                                return (
                                    <div
                                        onMouseDown={e => startDrag(e, 'photo')}
                                        className={`absolute bg-slate-100 flex items-center justify-center group overflow-hidden
                                            ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:ring-1 hover:ring-indigo-300'}`}
                                        style={{
                                            left: `${pp.x}%`, top: `${pp.y}%`,
                                            width: `${pp.width ?? 28}%`,
                                            height: `${pp.height ?? 26}%`,
                                            border: `${pp.borderWidth ?? 2}px solid ${pp.borderColor ?? '#6366f1'}`,
                                            cursor: 'move',
                                            ...shapeStyle,
                                        }}>
                                        <img src={PREVIEW_STUDENT.photo} alt="Student" className="w-full h-full object-cover pointer-events-none" />

                                        {/* Move icon overlay */}
                                        <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-all">
                                            <Move className="h-4 w-4 text-white drop-shadow" />
                                        </div>

                                        {/* Corner resize handle — bottom right */}
                                        {isSelected && (
                                            <div
                                                onMouseDown={startResize}
                                                title="Drag to resize"
                                                className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-600 rounded-tl-lg cursor-se-resize flex items-center justify-center z-20"
                                                style={{ pointerEvents: 'all' }}
                                            >
                                                <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 text-white" fill="currentColor">
                                                    <circle cx="6" cy="6" r="1.2"/>
                                                    <circle cx="3" cy="6" r="1.2"/>
                                                    <circle cx="6" cy="3" r="1.2"/>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Draggable Fields */}
                            {template.fields.map(field => {
                                const val = getVal(field.key);
                                return (
                                    <div key={field.id}
                                        onMouseDown={e => startDrag(e, field.id)}
                                        className={`absolute cursor-move flex flex-col group transition-all
                                            ${selectedEl===field.id ? 'ring-1 ring-indigo-500 rounded' : ''}`}
                                        style={{ left: `${field.x ?? 10}%`, top: `${field.y ?? 45}%` }}>
                                        <span className="text-[7px] text-slate-400 uppercase font-bold tracking-wide leading-none mb-0.5 group-hover:text-indigo-400">{field.label}</span>
                                        <span
                                            style={{
                                                fontSize: `${field.fontSize ?? 10}px`,
                                                fontWeight: field.bold ? 700 : 500,
                                                color: field.fontColor ?? template.textColor,
                                                whiteSpace: 'nowrap',
                                            }}>
                                            {val}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* Draggable Signature */}
                            {(() => {
                                const sp = template.signaturePosition!;
                                const shapeStyle = getShapeStyle(sp.shape);
                                return (
                                    <div onMouseDown={e => startDrag(e,'sig')}
                                        className={`absolute cursor-move flex flex-col items-center group
                                            ${selectedEl==='sig' ? 'ring-1 ring-indigo-500 rounded' : ''}`}
                                        style={{ left: `${sp.x ?? 70}%`, top: `${sp.y ?? 80}%`, width: `${sp.width ?? 20}%` }}>
                                        <div className="w-full border-b border-dashed border-slate-300/80" />
                                        <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{template.signatureText}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        /* Standard Grid Mode */
                        <div className={`flex-1 relative z-10 flex p-4 gap-4 ${template.layout === 'vertical' ? 'flex-col items-center' : 'items-center'}`}>
                            {template.showPhoto && (() => {
                                const pp = template.photoPosition!;
                                const shapeStyle = getShapeStyle(pp.shape);
                                return (
                                    <div className="overflow-hidden bg-slate-100 flex items-center justify-center shrink-0"
                                        style={{
                                            width: template.layout === 'vertical' ? '80px' : '90px',
                                            height: template.layout === 'vertical' ? '80px' : '90px',
                                            border: `${pp.borderWidth ?? 2}px solid ${pp.borderColor ?? '#6366f1'}`,
                                            ...shapeStyle,
                                        }}>
                                        <img src={PREVIEW_STUDENT.photo} alt="Student" className="w-full h-full object-cover" />
                                    </div>
                                );
                            })()}

                            <div className={`flex flex-col flex-1 ${template.layout === 'vertical' ? 'items-center text-center' : 'text-left'}`}>
                                {template.fields.map(field => {
                                    const val = getVal(field.key);
                                    return (
                                        <div key={field.id} className="mb-1.5">
                                            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">{field.label}</span>
                                            <span style={{
                                                fontSize: `${field.fontSize ?? 11}px`,
                                                fontWeight: field.bold ? 700 : 500,
                                                color: field.fontColor ?? template.textColor,
                                            }}>
                                                {val}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end self-end mt-auto w-full border-t border-slate-100 pt-2 items-end justify-between">
                                <div className="flex flex-col items-start text-left">
                                    <div className="h-px w-14 bg-slate-300 mb-1" />
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">{template.signatureText}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {template.showQRCode && (
                                        <div className="bg-white p-0.5 rounded border border-slate-200">
                                            <QRCode
                                                value="ADM-2024-001"
                                                size={28}
                                                style={{ height: 'auto', width: '28px' }}
                                                viewBox="0 0 256 256"
                                            />
                                        </div>
                                    )}
                                    <span className="text-[10px] font-bold" style={{ color: template.primaryColor }}>ADM-2024-001</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="h-2 shrink-0 relative z-10" style={{ backgroundColor: template.primaryColor }} />
                </div>

                {/* ── Live Size Controls — appear when photo is selected ── */}
                {selectedEl === 'photo' && template.layoutMode === 'drag-drop' && (
                    <div className="z-10 w-full max-w-sm bg-white border border-indigo-200 rounded-2xl shadow-lg px-5 py-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                            <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Photo Size</span>
                            <span className="ml-auto text-[10px] text-slate-400 italic">Drag ↘ corner handle or use sliders</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Width</label>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPhoto({ width: Math.max(5, (template.photoPosition?.width ?? 28) - 1) })} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 font-bold text-sm flex items-center justify-center transition-all">−</button>
                                    <span className="text-xs font-black text-indigo-700 w-10 text-center">{template.photoPosition?.width ?? 28}%</span>
                                    <button onClick={() => setPhoto({ width: Math.min(80, (template.photoPosition?.width ?? 28) + 1) })} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 font-bold text-sm flex items-center justify-center transition-all">+</button>
                                </div>
                            </div>
                            <input type="range" min={5} max={80} value={template.photoPosition?.width ?? 28} onChange={e => setPhoto({ width: +e.target.value })} className="w-full h-2 rounded-full accent-indigo-600 cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Height</label>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPhoto({ height: Math.max(5, (template.photoPosition?.height ?? 26) - 1) })} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 font-bold text-sm flex items-center justify-center transition-all">−</button>
                                    <span className="text-xs font-black text-indigo-700 w-10 text-center">{template.photoPosition?.height ?? 26}%</span>
                                    <button onClick={() => setPhoto({ height: Math.min(80, (template.photoPosition?.height ?? 26) + 1) })} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 font-bold text-sm flex items-center justify-center transition-all">+</button>
                                </div>
                            </div>
                            <input type="range" min={5} max={80} value={template.photoPosition?.height ?? 26} onChange={e => setPhoto({ height: +e.target.value })} className="w-full h-2 rounded-full accent-indigo-600 cursor-pointer" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------- small helper sub-components ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="font-bold text-slate-700 text-xs">{label}</Label>
            {children}
        </div>
    );
}
function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-0.5">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{label}</label>
            {children}
        </div>
    );
}
function ColorField({ label, color, onChange }: { label: string; color: string; onChange: (c: string) => void }) {
    return (
        <MiniField label={label}>
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg border shadow-sm shrink-0" style={{ backgroundColor: color }} />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 rounded-lg text-[10px] px-2">Pick</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none">
                        <HexColorPicker color={color} onChange={onChange} />
                    </PopoverContent>
                </Popover>
            </div>
        </MiniField>
    );
}
function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border">
            <div>
                <Label className="font-bold text-sm">{label}</Label>
                {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}
function IconBtn({ onClick, disabled, children, className, title }: {
    onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string; title?: string;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} title={title}
            className={`h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all ${className ?? ''}`}>
            {children}
        </button>
    );
}
function cardBorderRadiusCss(r?: string) {
    return r === 'none' ? '0px' : r === 'sm' ? '6px' : r === 'md' ? '12px' : r === 'lg' ? '18px' : r === 'full' ? '28px' : '12px';
}
function Move({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M12 12h.01"/><path d="M12 3v18M3 12h18" strokeWidth={1.5}/></svg>; }
