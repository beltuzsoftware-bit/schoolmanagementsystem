"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { IdCard, Printer, Search, User, Plus, Edit2, Trash2, Copy, CheckSquare, Square, RefreshCw, Download, Loader2, Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getIDCardTemplates, getSchools, getStudents, addIDCardTemplate, updateIDCardTemplate, deleteIDCardTemplate } from "@/app/actions";
import { analyzeIDCardLayout } from "@/app/actions/ai-actions";
import { IDCardTemplate, School, Student } from "@/types";
import { IDCardPreview } from "@/components/id-cards/id-card-preview";
import IDCardTemplateEditor from "@/components/super-admin/id-card-template-editor";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

export default function IDCardsPage() {
    const [templates, setTemplates] = useState<IDCardTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [school, setSchool] = useState<School | null>(null);
    const [mounted, setMounted] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
    const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<IDCardTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [activePageTab, setActivePageTab] = useState<'templates' | 'school-cards' | 'generate'>('generate');

    // Generate Tab States
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedSection, setSelectedSection] = useState<string>("");
    const [generateTemplate, setGenerateTemplate] = useState<string>("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const [studentsToZip, setStudentsToZip] = useState<Student[]>([]);

    // Rename Dialog States
    const [renamingTemplate, setRenamingTemplate] = useState<IDCardTemplate | null>(null);
    const [newName, setNewName] = useState("");

    // AI Creator States
    const [isAICreatorOpen, setIsAICreatorOpen] = useState(false);
    const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
    const [aiStage, setAiStage] = useState("");
    const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
    const [aiBgBase64, setAiBgBase64] = useState<string | null>(null);
    const [geminiKey, setGeminiKey] = useState("");
    const [aiResultTemplate, setAiResultTemplate] = useState<Partial<IDCardTemplate> | null>(null);

    const dummyStudent: Student = {
        id: "dummy_123",
        schoolId: school?.id || "s1",
        admissionNumber: "ADM-2026-991",
        rollNumber: "42",
        name: "Aarav Sharma",
        firstName: "Aarav",
        lastName: "Sharma",
        className: "Grade 10",
        section: "A",
        phone: "+91 98765 43210",
        currentAddress: "123 Green Valley Road, Sector 4, New Delhi, India",
        bloodGroup: "O+",
        dob: "2011-05-15",
        status: "Active",
        currentSessionId: "session_2026",
        gender: "Male",
        fatherName: "Rajesh Sharma",
        motherName: "Sunita Sharma"
    };


    const schoolTemplates = templates.filter(t => t.schoolId === school?.id);
    const globalTemplates = templates.filter(t => {
        const isGlobal = !t.schoolId || t.isGlobal;
        if (!isGlobal) return false;
        // Check if school already added this template (by matching clonedFromId OR name)
        const alreadyAdded = schoolTemplates.some(st => 
            st.clonedFromId === t.id ||
            st.name.toLowerCase().includes(t.name.toLowerCase())
        );
        return !alreadyAdded;
    });
    const totalGlobalCount = templates.filter(t => !t.schoolId || t.isGlobal).length;

    // Unique classes and sections from students
    const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();
    const uniqueSections = Array.from(new Set(students.map(s => s.section || ''))).filter(Boolean).sort();

    useEffect(() => {
        if (schoolTemplates.length > 0) {
            if (!schoolTemplates.some(t => t.id === selectedTemplate)) {
                setSelectedTemplate(schoolTemplates[0].id);
            }
            if (!schoolTemplates.some(t => t.id === generateTemplate)) {
                const defaultTmpl = schoolTemplates.find(t => t.isDefault);
                setGenerateTemplate(defaultTmpl ? defaultTmpl.id : "");
            }
        } else {
            setSelectedTemplate("");
            setGenerateTemplate("");
        }
    }, [templates, school?.id, selectedTemplate, schoolTemplates, generateTemplate]);

    useEffect(() => {
        if (studentsToPrint.length > 0) {
            // Guard against double-print (image-load path + fallback timer both firing)
            let printed = false;

            const triggerPrint = () => {
                if (printed) return;
                printed = true;
                // Two rAF calls ensure layout is fully flushed before the dialog opens
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        window.print();
                        setStudentsToPrint([]);
                    });
                });
            };

            const doPrint = () => {
                const container = document.getElementById('printable-id-cards-container');
                if (!container) { triggerPrint(); return; }

                const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
                const pending = imgs.filter(img => !img.complete);

                if (pending.length === 0) {
                    triggerPrint();
                } else {
                    // Wait for every photo to decode before opening print dialog
                    let resolved = 0;
                    const onDone = () => { if (++resolved >= pending.length) triggerPrint(); };
                    pending.forEach(img => {
                        img.addEventListener('load', onDone, { once: true });
                        img.addEventListener('error', onDone, { once: true });
                    });
                    // Safety fallback: print after 4s regardless
                    setTimeout(triggerPrint, 4000);
                }
            };

            // Small delay so React finishes rendering the printable container
            const timer = setTimeout(doPrint, 150);
            return () => clearTimeout(timer);
        }
    }, [studentsToPrint]);

    useEffect(() => {
        setMounted(true);
        const fetchData = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            let userSchoolId = "";
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user.schoolId) {
                    userSchoolId = user.schoolId;
                    const schools = await getSchools();
                    const s = schools.find((sch: School) => sch.id === user.schoolId);
                    if (s) setSchool(s);

                    const stds = await getStudents(user.schoolId);
                    setStudents(stds);
                }
            }
            const t = await getIDCardTemplates(userSchoolId);
            setTemplates(t);
            // Default to the first school-specific template if available
            const sT = t.filter(tmpl => tmpl.schoolId === userSchoolId);
            if (sT.length > 0) {
                setSelectedTemplate(sT[0].id);
                const defaultTmpl = sT.find(tmpl => tmpl.isDefault);
                setGenerateTemplate(defaultTmpl ? defaultTmpl.id : ""); 
            } else {
                setSelectedTemplate("");
                setGenerateTemplate("");
            }
        };
        fetchData();
    }, []);

    const handleSave = async (updatedTemplate: IDCardTemplate) => {
        try {
            if (isCreating) {
                const res = await addIDCardTemplate({
                    ...updatedTemplate,
                    schoolId: school?.id || undefined,
                    isGlobal: false
                });
                if (res.success && res.template) {
                    setTemplates([...templates, res.template]);
                    setSelectedTemplate(res.template.id);
                    toast.success('Saved successfully');
                    setEditingTemplate(null);
                    setIsCreating(false);
                } else {
                    toast.error((res as any).error || 'Failed to create template');
                }
            } else {
                const res = await updateIDCardTemplate(updatedTemplate);
                if (res.success) {
                    setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
                    toast.success('Saved successfully');
                    setEditingTemplate(null);
                    setIsCreating(false);
                } else {
                    toast.error((res as any).error || 'Failed to update template');
                }
            }
        } catch (error: any) {
            console.error('[handleSave] Exception:', error);
            toast.error(`Failed to save template: ${error?.message || String(error)}`);
        }
    };

    const handleCreate = () => {
        const newTemplate: IDCardTemplate = {
            id: 'new',
            name: 'Custom Template',
            layout: 'vertical',
            width: 54,
            height: 86,
            primaryColor: '#3b82f6',
            secondaryColor: '#ffffff',
            fontFamily: 'Inter',
            showPhoto: true,
            showLogo: true,
            signatureText: 'Principal',
            schoolId: school?.id || undefined,
            isGlobal: false,
            fields: [
                { id: 'f1', label: 'Name', key: 'name', bold: true },
                { id: 'f2', label: 'Class', key: 'className', bold: false }
            ]
        };
        setEditingTemplate(newTemplate);
        setIsCreating(true);
    };

    const handleEdit = (tmpl: IDCardTemplate) => {
        setEditingTemplate(tmpl);
        setIsCreating(false);
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await deleteIDCardTemplate(id);
            if (res.success) {
                const remaining = templates.filter(t => t.id !== id);
                setTemplates(remaining);
                if (selectedTemplate === id) {
                    const remainingSchool = remaining.filter(t => t.schoolId === school?.id);
                    if (remainingSchool.length > 0) {
                        setSelectedTemplate(remainingSchool[0].id);
                    } else {
                        setSelectedTemplate('');
                    }
                }
                toast.success('Template deleted successfully');
            } else {
                toast.error((res as any).error || 'Failed to delete template');
            }
        } catch (error: any) {
            console.error('[handleDelete] error:', error);
            toast.error(`Failed to delete: ${error?.message || String(error)}`);
        }
    };


    const handleToggleDefault = async (tmpl: IDCardTemplate) => {
        try {
            const isNowDefault = !tmpl.isDefault;
            const updated = { ...tmpl, isDefault: isNowDefault };
            const res = await updateIDCardTemplate(updated);
            if (res.success) {
                const newTemplates = templates.map(t => {
                    if (t.id === tmpl.id) return { ...t, isDefault: isNowDefault };
                    if (isNowDefault && t.schoolId === tmpl.schoolId && t.id !== tmpl.id) return { ...t, isDefault: false };
                    return t;
                });
                setTemplates(newTemplates);
                toast.success(isNowDefault ? 'Set as default template' : 'Removed from default');
            } else {
                toast.error('Failed to update default status');
            }
        } catch (error) {
            toast.error('Failed to update template');
        }
    };

    const handleRenameClick = (tmpl: IDCardTemplate) => {
        setRenamingTemplate(tmpl);
        setNewName(tmpl.name);
    };

    const handleRenameSave = async () => {
        if (!renamingTemplate || !newName.trim()) return;
        try {
            const updated = { ...renamingTemplate, name: newName };
            const res = await updateIDCardTemplate(updated);
            if (res.success) {
                setTemplates(templates.map(t => t.id === renamingTemplate.id ? updated : t));
                toast.success('Template renamed successfully');
                setRenamingTemplate(null);
            }
        } catch (error) {
            toast.error('Failed to rename template');
        }
    };

    const handleAddToSchool = async (tmpl: IDCardTemplate) => {
        try {
            const cloned: IDCardTemplate = {
                ...tmpl,
                id: 'new',
                name: `${tmpl.name} (Custom)`,
                schoolId: school?.id || undefined,
                isGlobal: false,
                clonedFromId: tmpl.id
            };
            const res = await addIDCardTemplate(cloned);
            if (res.success && res.template) {
                setTemplates([...templates, res.template]);
                setSelectedTemplate(res.template.id);
                setActivePageTab('school-cards');
                toast.success(`"${tmpl.name}" added to your School ID Cards!`);
            } else {
                toast.error((res as any).error || 'Failed to add template to school');
            }
        } catch (error: any) {
            console.error('[handleAddToSchool] error:', error);
            toast.error(`Failed to add template: ${error?.message || String(error)}`);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'sample' | 'bg') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'sample') {
                setAiImageBase64(reader.result as string);
            } else {
                setAiBgBase64(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAIAnalyze = async () => {
        if (!aiImageBase64) {
            toast.error("Please upload a sample ID card image.");
            return;
        }

        setIsAIAnalyzing(true);
        setAiResultTemplate(null);
        
        try {
            setAiStage("Connecting to Google Gemini API...");
            await new Promise(r => setTimeout(r, 600));
            setAiStage("Detecting layout boundaries & grid...");
            await new Promise(r => setTimeout(r, 600));
            setAiStage("Analyzing photo/signature slots...");
            await new Promise(r => setTimeout(r, 600));
            setAiStage("Extracting labels (Name, Class, Roll Number)...");
            
            const res = await analyzeIDCardLayout(aiImageBase64, "card_sample.jpg", geminiKey || undefined);
            if (res.success && res.template) {
                // Attach background image if uploaded
                const finalTemplate = {
                    ...res.template,
                    backgroundImage: aiBgBase64 || undefined
                };
                setAiResultTemplate(finalTemplate);
                toast.success("AI Layout Analysis Complete!");
            } else {
                toast.error(res.error || "Failed to analyze template");
            }
        } catch (err: any) {
            console.error('[handleAIAnalyze] error:', err);
            toast.error(`Error: ${err?.message || String(err)}`);
        } finally {
            setIsAIAnalyzing(false);
            setAiStage("");
        }
    };

    const handleSaveAITemplate = async () => {
        if (!aiResultTemplate) return;

        try {
            const finalTemplate: IDCardTemplate = {
                ...(aiResultTemplate as IDCardTemplate),
                id: 'new',
                schoolId: school?.id || undefined,
                isGlobal: false
            };

            const res = await addIDCardTemplate(finalTemplate);
            if (res.success && res.template) {
                setTemplates([...templates, res.template]);
                setSelectedTemplate(res.template.id);
                setActivePageTab('school-cards');
                setIsAICreatorOpen(false);
                setAiImageBase64(null);
                setAiBgBase64(null);
                setAiResultTemplate(null);
                toast.success(`"${res.template.name}" added to your School ID Cards!`);
            } else {
                toast.error((res as any).error || 'Failed to save AI template');
            }
        } catch (error: any) {
            console.error('[handleSaveAITemplate] error:', error);
            toast.error(`Failed to save: ${error?.message || String(error)}`);
        }
    };


    // Filters for Generate tab
    const filteredGenerateStudents = students.filter(s => {
        const matchesClass = selectedClass === "all" || s.className === selectedClass;
        const matchesSection = selectedSection === "all" || s.section === selectedSection;
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        return (s.status || 'Active') === 'Active' && matchesClass && matchesSection && matchesSearch;
    });

    const handleToggleStudentSelection = (studentId: string) => {
        const next = new Set(selectedStudentIds);
        if (next.has(studentId)) {
            next.delete(studentId);
        } else {
            next.add(studentId);
        }
        setSelectedStudentIds(next);
    };

    const handleToggleSelectAll = () => {
        if (selectedStudentIds.size === filteredGenerateStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(filteredGenerateStudents.map(s => s.id)));
        }
    };

    const handlePrintSelected = () => {
        const toPrint = students.filter(s => selectedStudentIds.has(s.id));
        if (toPrint.length === 0) {
            toast.error("Please select at least one student");
            return;
        }
        if (!generateTemplate) {
            toast.error("Please select a template to generate cards");
            return;
        }
        setStudentsToPrint(toPrint);
    };

    const handleDownloadZip = () => {
        const toDownload = students.filter(s => selectedStudentIds.has(s.id));
        if (toDownload.length === 0) { toast.error('Please select at least one student'); return; }
        if (!generateTemplate) { toast.error('Please select a template'); return; }
        setIsDownloadingZip(true);
        setStudentsToZip(toDownload); // triggers useEffect below
    };

    // Runs whenever studentsToZip is populated — waits for the hidden render
    // container to settle, then captures each card with html2canvas and zips them.
    useEffect(() => {
        if (studentsToZip.length === 0 || !isDownloadingZip) return;

        const capture = async () => {
            try {
                const [{ domToPng }, JSZip] = await Promise.all([
                    import('modern-screenshot'),
                    import('jszip').then(m => m.default),
                ]);
                const zip = new JSZip();

                toast.info(`Generating ${studentsToZip.length} ID card image${studentsToZip.length > 1 ? 's' : ''}...`);

                const container = document.getElementById('zip-render-container');
                if (!container) throw new Error('Render container missing');

                // Bring on-screen (html-to-image uses SVG foreignObject
                // which needs the element to be in the layout tree at left:0)
                container.style.left = '0';
                container.style.top = '-99999px';

                // Wait for all base64 photos to decode
                await new Promise<void>(resolve => {
                    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
                    const pending = imgs.filter(img => !img.complete);
                    if (pending.length === 0) { resolve(); return; }
                    let done = 0;
                    const onDone = () => { if (++done >= pending.length) resolve(); };
                    pending.forEach(img => {
                        img.addEventListener('load', onDone, { once: true });
                        img.addEventListener('error', onDone, { once: true });
                    });
                    setTimeout(resolve, 5000);
                });

                // Capture each card wrapper individually as PNG
                const wrappers = Array.from(
                    container.querySelectorAll('[data-zip-student-id]')
                ) as HTMLElement[];

                for (let i = 0; i < wrappers.length; i++) {
                    const wrapper = wrappers[i];
                    const student = studentsToZip[i];
                    if (!student) continue;

                    const SCALE = 3;

                    // Collect all <img> elements and their positions BEFORE hiding them
                    const photoImgs = Array.from(wrapper.querySelectorAll('img')) as HTMLImageElement[];
                    const wrapperRect = wrapper.getBoundingClientRect();

                    // Record each photo's position relative to the card wrapper
                    const photoPositions = photoImgs.map(img => {
                        const r = img.getBoundingClientRect();
                        return {
                            src: img.src,
                            x: r.left - wrapperRect.left,
                            y: r.top - wrapperRect.top,
                            w: r.width,
                            h: r.height,
                        };
                    });

                    // Step 1: hide photos, render card structure via domToPng
                    // (SVG foreignObject blocks image loading, so we skip them here)
                    photoImgs.forEach(img => { img.style.visibility = 'hidden'; });

                    const baseDataUrl = await domToPng(wrapper, {
                        scale: SCALE,
                        backgroundColor: '#ffffff',
                    });

                    // Restore photos immediately
                    photoImgs.forEach(img => { img.style.visibility = ''; });

                    // Step 2: Composite photos onto the canvas using native drawImage()
                    // which always works with base64 data URIs
                    const baseImg = new Image();
                    baseImg.src = baseDataUrl;
                    await new Promise<void>(res => { baseImg.onload = () => res(); });

                    const canvas = document.createElement('canvas');
                    canvas.width = baseImg.width;
                    canvas.height = baseImg.height;
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(baseImg, 0, 0);

                    for (const pos of photoPositions) {
                        if (!pos.src || pos.w <= 0 || pos.h <= 0) continue;

                        const photo = new Image();
                        photo.src = pos.src;
                        await new Promise<void>(res => {
                            photo.onload = () => res();
                            photo.onerror = () => res();
                        });

                        // Draw with object-cover: scale to fill, center-crop
                        const px = pos.x * SCALE;
                        const py = pos.y * SCALE;
                        const pw = pos.w * SCALE;
                        const ph = pos.h * SCALE;

                        const imgScale = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
                        const dw = photo.naturalWidth * imgScale;
                        const dh = photo.naturalHeight * imgScale;
                        const dx = px + (pw - dw) / 2;
                        const dy = py + (ph - dh) / 2;

                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(px, py, pw, ph);
                        ctx.clip();
                        ctx.drawImage(photo, dx, dy, dw, dh);
                        ctx.restore();
                    }

                    const blob = await new Promise<Blob>(res =>
                        canvas.toBlob(b => res(b!), 'image/png')
                    );

                    const safeName = (student.name || student.firstName || `Student_${i + 1}`)
                        .replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
                    const rawAdm = student.admissionNumber ? `_${student.admissionNumber}` : '';
                    const safeAdm = rawAdm.replace(/[^a-zA-Z0-9 _-]/g, '_').trim().replace(/\s+/g, '_');
                    zip.file(`${i + 1}_${safeName}${safeAdm}_IDCard.png`, blob);
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `IDCards_${new Date().toISOString().slice(0, 10)}.zip`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast.success(`✅ Downloaded ${studentsToZip.length} ID card${studentsToZip.length > 1 ? 's' : ''} as ZIP!`);
            } catch (err) {
                console.error('ZIP generation failed:', err);
                toast.error('Failed to generate ZIP. Please try again.');
            } finally {
                // Restore off-screen position
                const c = document.getElementById('zip-render-container');
                if (c) { c.style.left = '-9999px'; c.style.top = '0'; }
                setStudentsToZip([]);
                setIsDownloadingZip(false);
            }
        };

        // Small delay so React finishes rendering the zip container
        const timer = setTimeout(capture, 200);
        return () => clearTimeout(timer);
    }, [studentsToZip, isDownloadingZip]);


    if (!mounted) return null;

    if (editingTemplate) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        {isCreating ? 'Create New Template' : `Edit ${editingTemplate.name}`}
                    </h1>
                </div>
                <IDCardTemplateEditor
                    template={editingTemplate}
                    onSave={handleSave}
                    onCancel={() => setEditingTemplate(null)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">ID Cards</h1>
                    <p className="text-slate-500">Generate and print student identity cards</p>
                </div>
                {activePageTab === 'school-cards' && schoolTemplates.length > 0 && (
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => setIsAICreatorOpen(true)}
                            className="gap-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-300"
                        >
                            <Sparkles className="h-4 w-4 text-white animate-pulse" /> Create with AI
                        </Button>
                        <Button 
                            onClick={handleCreate}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                            <Plus className="h-4 w-4" /> Create Custom Design
                        </Button>
                    </div>
                )}
            </div>

            {/* Premium Page Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActivePageTab('generate')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 ${
                        activePageTab === 'generate'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    🖨 Generate ID Cards
                </button>
                <button
                    onClick={() => setActivePageTab('school-cards')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 ${
                        activePageTab === 'school-cards'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    🏫 School ID Cards ({schoolTemplates.length})
                </button>
                <button
                    onClick={() => setActivePageTab('templates')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 ${
                        activePageTab === 'templates'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    🗂 Global Templates ({globalTemplates.length}/{totalGlobalCount})
                </button>
            </div>

            {/* Content Switcher */}
            {activePageTab === 'templates' && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {globalTemplates.map(tmpl => (
                        <Card key={tmpl.id} className="border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-indigo-300 transition-all">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-slate-800">{tmpl.name}</CardTitle>
                                <CardDescription className="text-xs">
                                    Layout: <span className="capitalize">{tmpl.layout}</span> | {tmpl.width}x{tmpl.height} mm
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col items-center justify-between gap-6 p-4">
                                <div className="scale-[0.65] origin-center my-4 h-[220px] flex items-center justify-center">
                                    <IDCardPreview
                                        student={{
                                            id: "DEMO",
                                            name: "Rahul Sharma",
                                            firstName: "Rahul",
                                            lastName: "Sharma",
                                            admissionNumber: "ADM001",
                                            rollNumber: "12",
                                            className: "Grade 10",
                                            section: "A",
                                            dob: "2010-05-15",
                                            gender: "Male",
                                            bloodGroup: "B+",
                                            schoolId: school?.id || "s1",
                                            status: "Active",
                                            currentSessionId: "sess1",
                                            fatherName: "Sanjay Sharma",
                                            motherName: "Anjali Sharma",
                                            phone: "9123456780",
                                            currentAddress: "Mumbai, India"
                                        }}
                                        template={tmpl}
                                        school={school}
                                        scale={4}
                                    />
                                </div>
                                <Button 
                                    onClick={() => handleAddToSchool(tmpl)}
                                    className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                >
                                    <Plus className="h-4 w-4" /> Add to School ID Cards
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {activePageTab === 'school-cards' && (
                schoolTemplates.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                        <div className="text-4xl">📇</div>
                        <h3 className="text-lg font-bold text-slate-800">No School ID Card Templates</h3>
                        <p className="text-slate-500 max-w-sm mx-auto text-sm">
                            Add a template from the Global Templates library or build your own custom design from scratch.
                        </p>
                        <div className="flex justify-center gap-3 pt-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setActivePageTab('templates')}
                                className="gap-2 border-slate-300"
                            >
                                <Search className="h-4 w-4" /> Browse Global Templates
                            </Button>
                            <Button 
                                onClick={() => setIsAICreatorOpen(true)}
                                className="gap-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 text-white font-bold"
                            >
                                <Sparkles className="h-4 w-4 text-white animate-pulse" /> Create with AI
                            </Button>
                            <Button 
                                onClick={handleCreate}
                                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Plus className="h-4 w-4" /> Create Custom Design
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {schoolTemplates.map(tmpl => (
                            <Card key={tmpl.id} className="border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-indigo-300 transition-all bg-white">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-800">{tmpl.name}</CardTitle>
                                        <CardDescription className="text-xs">
                                            Layout: <span className="capitalize">{tmpl.layout}</span> | {tmpl.width}x{tmpl.height} mm
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        variant={tmpl.isDefault ? "default" : "outline"} 
                                        size="sm" 
                                        className={`h-7 px-2 text-[10px] uppercase font-bold tracking-wider rounded-full ${tmpl.isDefault ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white' : 'text-slate-500'}`}
                                        onClick={(e) => { e.stopPropagation(); handleToggleDefault(tmpl); }}
                                        title={tmpl.isDefault ? "This is the default template" : "Set as default template"}
                                    >
                                        {tmpl.isDefault ? "★ Default" : "Set Default"}
                                    </Button>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col items-center justify-between gap-6 p-4">
                                    <div className="scale-[0.65] origin-center my-4 h-[220px] flex items-center justify-center">
                                        <IDCardPreview
                                            student={{
                                                id: "DEMO",
                                                name: "Rahul Sharma",
                                                firstName: "Rahul",
                                                lastName: "Sharma",
                                                admissionNumber: "ADM001",
                                                rollNumber: "12",
                                                className: "Grade 10",
                                                section: "A",
                                                dob: "2010-05-15",
                                                gender: "Male",
                                                bloodGroup: "B+",
                                                schoolId: school?.id || "s1",
                                                status: "Active",
                                                currentSessionId: "sess1",
                                                fatherName: "Sanjay Sharma",
                                                motherName: "Anjali Sharma",
                                                phone: "9123456780",
                                                currentAddress: "Mumbai, India"
                                            }}
                                            template={tmpl}
                                            school={school}
                                            scale={4}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(tmpl)}
                                            className="gap-1.5 text-xs font-semibold"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" /> Edit
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRenameClick(tmpl)}
                                            className="gap-1.5 text-xs font-semibold"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" /> Rename
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedTemplate(tmpl.id);
                                                // Prefer a student with a photo for a representative preview
                                                const bestPreview = students.find(s => s.photo) || students[0] || {
                                                    id: "DEMO",
                                                    name: "Rahul Sharma",
                                                    firstName: "Rahul",
                                                    lastName: "Sharma",
                                                    admissionNumber: "ADM001",
                                                    rollNumber: "12",
                                                    className: "Grade 10",
                                                    section: "A",
                                                    dob: "2010-05-15",
                                                    gender: "Male",
                                                    bloodGroup: "B+",
                                                    schoolId: school?.id || "s1",
                                                    status: "Active",
                                                    currentSessionId: "sess1",
                                                    fatherName: "Sanjay Sharma",
                                                    motherName: "Anjali Sharma",
                                                    phone: "9123456780",
                                                    currentAddress: "Mumbai, India"
                                                } as any;
                                                setPreviewStudent(bestPreview);
                                            }}
                                            className="gap-1.5 text-xs font-semibold"
                                        >
                                            <IdCard className="h-3.5 w-3.5" /> Preview
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(tmpl.id)}
                                            className="gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            )}

            {activePageTab === 'generate' && (
                <div className="grid gap-6 md:grid-cols-4">
                    {/* Left Sidebar Filter */}
                    <Card className="md:col-span-1 border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Filters</CardTitle>
                            <CardDescription>Select Class, Template, & Students</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Class <span className="text-red-500">*</span></label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {uniqueClasses.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Section <span className="text-red-500">*</span></label>
                                <Select value={selectedSection} onValueChange={setSelectedSection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {uniqueSections.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Template <span className="text-red-500">*</span></label>
                                <Select value={generateTemplate} onValueChange={setGenerateTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {schoolTemplates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button 
                                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                disabled={selectedStudentIds.size === 0 || !generateTemplate}
                                onClick={handlePrintSelected}
                            >
                                <Printer className="h-4 w-4" /> Print Selected ({selectedStudentIds.size})
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                                disabled={selectedStudentIds.size === 0 || !generateTemplate || isDownloadingZip}
                                onClick={handleDownloadZip}
                            >
                                {isDownloadingZip ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating ZIP...</>
                                ) : (
                                    <><Download className="h-4 w-4" /> Download ZIP ({selectedStudentIds.size})</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Students Checkbox Table */}
                    <Card className="md:col-span-3 border-slate-200 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Student List</CardTitle>
                                    <CardDescription>Select multiple students to generate ID Cards</CardDescription>
                                </div>
                                {selectedClass && selectedSection && generateTemplate && (
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            placeholder="Search student..."
                                            className="pl-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(!selectedClass || !selectedSection || !generateTemplate) ? (
                                <div className="py-12 text-center text-slate-500 border rounded-md border-dashed flex flex-col items-center">
                                    <IdCard className="h-12 w-12 mb-4 text-slate-300" />
                                    <h3 className="text-lg font-medium text-slate-700">Selection Required</h3>
                                    <p className="mt-1 max-w-sm">Please select a Class, Section, and Template from the left sidebar to view and generate ID cards.</p>
                                </div>
                            ) : (
                                <>
                                <div className="border rounded-md">
                                    <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-12">
                                                <Checkbox 
                                                    checked={filteredGenerateStudents.length > 0 && selectedStudentIds.size === filteredGenerateStudents.length}
                                                    onCheckedChange={handleToggleSelectAll}
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">ID</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Class</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Roll No</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredGenerateStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <Checkbox 
                                                        checked={selectedStudentIds.has(student.id)}
                                                        onCheckedChange={() => handleToggleStudentSelection(student.id)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs">{student.admissionNumber}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                                                <td className="px-4 py-3 text-slate-600">{student.className}-{student.section}</td>
                                                <td className="px-4 py-3 text-slate-600">{student.rollNumber}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredGenerateStudents.length === 0 && (
                                <div className="py-12 text-center">
                                    <User className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 italic">No students found matching your filters</p>
                                </div>
                            )}
                            </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Rename Template Dialog */}
            <Dialog open={!!renamingTemplate} onOpenChange={(open) => !open && setRenamingTemplate(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Template</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your template.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)} 
                            placeholder="Template name"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setRenamingTemplate(null)}>
                            Cancel
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={handleRenameSave}
                        >
                            Save Name
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ID Card Preview Dialog */}
            <Dialog open={!!previewStudent} onOpenChange={(open) => !open && setPreviewStudent(null)}>
                <DialogContent className="sm:max-w-[650px] w-full">
                    <DialogHeader>
                        <DialogTitle>ID Card Preview</DialogTitle>
                        <DialogDescription>
                            Review the card before printing.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-center p-6 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
                        {previewStudent && (
                            <IDCardPreview
                                student={previewStudent}
                                template={templates.find(t => t.id === selectedTemplate) || templates[0]}
                                school={school}
                                scale={6.5}
                            />
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setPreviewStudent(null)}>
                            Cancel
                        </Button>
                        <Button 
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                if (previewStudent) {
                                    setStudentsToPrint([previewStudent]);
                                }
                            }}
                        >
                            <Printer className="h-4 w-4" />
                            Print Now
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* AI ID Card Creator Dialog */}
            <Dialog open={isAICreatorOpen} onOpenChange={(open) => {
                if (!open && !isAIAnalyzing) {
                    setIsAICreatorOpen(false);
                    setAiImageBase64(null);
                    setAiBgBase64(null);
                    setAiResultTemplate(null);
                }
            }}>
                <DialogContent className="sm:max-w-[850px] w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                                <Sparkles className="h-5 w-5 animate-pulse" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">Create ID Card Template with AI</DialogTitle>
                                <DialogDescription>
                                    Upload a sample card image. Gemini will automatically detect the layout and position photo & fields.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {isAIAnalyzing ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                            <div className="text-center">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">Analyzing Layout...</h3>
                                <p className="text-sm text-slate-500 mt-1 animate-pulse">{aiStage}</p>
                            </div>
                        </div>
                    ) : aiResultTemplate ? (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left Side: Original Image */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Original Sample</h4>
                                    <div className="aspect-[3/2] w-full border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center relative">
                                        <img 
                                            src={aiImageBase64 || ""} 
                                            alt="Original Sample" 
                                            className="max-w-full max-h-full object-contain" 
                                        />
                                    </div>
                                </div>

                                {/* Right Side: Reconstructed Live HTML Preview */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">AI Reconstructed Live Template</h4>
                                    <div className="aspect-[3/2] w-full border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center relative p-2">
                                        <IDCardPreview
                                            student={dummyStudent}
                                            template={aiResultTemplate as IDCardTemplate}
                                            school={school}
                                            scale={3.2}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Template successfully generated!</p>
                                    <p className="text-xs text-slate-500">You can customize the layout further using the drag-and-drop designer after saving.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setAiResultTemplate(null)}>
                                        Re-analyze
                                    </Button>
                                    <Button 
                                        onClick={handleSaveAITemplate}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                    >
                                        Save Template
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left Side: Sample ID Card Image */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">1. Upload Sample Card (Filled)</label>
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all relative">
                                        {aiImageBase64 ? (
                                            <div className="relative group aspect-[3/2] w-full max-w-[260px] mx-auto overflow-hidden rounded-lg border bg-white flex items-center justify-center">
                                                <img src={aiImageBase64} alt="Sample Card" className="max-w-full max-h-full object-contain" />
                                                <button 
                                                    onClick={() => setAiImageBase64(null)}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                                                >
                                                    Change Image
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-6 flex flex-col items-center">
                                                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag & drop or click to upload</p>
                                                <p className="text-xs text-slate-500 mt-1">Accepts PNG, JPG, or JPEG</p>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                    onChange={(e) => handleFileChange(e, 'sample')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Blank Background Image */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">2. Upload Blank Background (Optional)</label>
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all relative">
                                        {aiBgBase64 ? (
                                            <div className="relative group aspect-[3/2] w-full max-w-[260px] mx-auto overflow-hidden rounded-lg border bg-white flex items-center justify-center">
                                                <img src={aiBgBase64} alt="Blank Background" className="max-w-full max-h-full object-contain" />
                                                <button 
                                                    onClick={() => setAiBgBase64(null)}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                                                >
                                                    Change Image
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-6 flex flex-col items-center">
                                                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag & drop or click to upload</p>
                                                <p className="text-xs text-slate-500 mt-1">Clean background watermark / texture</p>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                    onChange={(e) => handleFileChange(e, 'bg')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 space-y-3">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
                                        3. Gemini API Key (Optional)
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Paste your Google Gemini API Key here (or leave blank if set in server .env)"
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        className="font-mono bg-white"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Your key is kept safe and never stored. Obtain a key from Google AI Studio.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t">
                                <Button variant="outline" onClick={() => setIsAICreatorOpen(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    className="gap-2 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold shadow-md hover:shadow-lg"
                                    onClick={handleAIAnalyze}
                                    disabled={!aiImageBase64}
                                >
                                    <Sparkles className="h-4 w-4 text-white animate-pulse" />
                                    Start AI Analysis
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ZIP render container — off-screen, visible to html2canvas.
              Cards rendered here are captured one-by-one during ZIP generation. */}
            <div
                id="zip-render-container"
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: '-9999px',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                {studentsToZip.map((student, i) => {
                    const tpl = templates.find(t => t.id === generateTemplate) || templates[0];
                    return (
                        <div
                            key={student.id}
                            data-zip-student-id={student.id}
                            style={{ display: 'inline-block' }}
                        >
                            <IDCardPreview
                                student={student}
                                template={tpl}
                                school={school}
                                scale={4}
                            />
                        </div>
                    );
                })}
            </div>

            <div
                id="printable-id-cards-container"
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    opacity: 0,
                    zIndex: -1,
                    pointerEvents: 'none',
                }}
            >
                {studentsToPrint.map(student => {
                    const tpl = templates.find(t => t.id === (generateTemplate || selectedTemplate)) || templates[0];
                    return (
                        <div key={student.id} className="print-card-wrapper">
                            <IDCardPreview
                                student={student}
                                template={tpl}
                                school={school}
                                scale={4}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Print styles.
                During @media print, browser removes clip-path and visibility
                restrictions so the container renders at its natural pixel size.
                visibility:hidden/visible is the ONLY cascade that lets children
                override a hidden ancestor (display:none cannot be overridden). */}
            <style>{`
                @media print {
                    @page {
                        margin: 4mm;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    body > * {
                        height: 0 !important;
                        min-height: 0 !important;
                    }
                    #printable-id-cards-container,
                    #printable-id-cards-container * {
                        visibility: visible !important;
                    }
                    #printable-id-cards-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        opacity: 1 !important;
                        z-index: 99999 !important;
                        width: 100% !important;
                        height: auto !important;
                        display: grid !important;
                        grid-template-columns: repeat(2, max-content) !important;
                        justify-content: center !important;
                        align-content: start !important;
                        gap: 2mm !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                    }
                    .print-card-wrapper {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        width: auto !important;
                        margin: 0 !important;
                        display: block !important;
                    }
                    .print-card {
                        width: var(--print-width) !important;
                        height: var(--print-height) !important;
                        box-shadow: none !important;
                        border: 1px solid #000 !important;
                        overflow: hidden !important;
                    }
                    .print-card * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-card img {
                        display: block !important;
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                    }
                }
            `}</style>
        </div>
    );
}
