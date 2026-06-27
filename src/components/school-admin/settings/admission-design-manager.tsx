'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Eye, Layout, Palette } from "lucide-react";
import { AdmissionFormTemplate } from "@/types";
import { getAdmissionFormTemplates, updateSchoolAdmissionTemplate } from "@/app/actions";
import { toast } from "sonner";
import AdmissionFormPreview from "@/components/super-admin/admission-form-preview";

interface AdmissionDesignManagerProps {
    schoolId: string;
    currentTemplateId?: string;
}

export default function AdmissionDesignManager({ schoolId, currentTemplateId }: AdmissionDesignManagerProps) {
    const [templates, setTemplates] = useState<AdmissionFormTemplate[]>([]);
    const [selectedId, setSelectedId] = useState(currentTemplateId);
    const [previewTemplate, setPreviewTemplate] = useState<AdmissionFormTemplate | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const data = await getAdmissionFormTemplates();
        setTemplates(data);
        if (!selectedId && data.find((t: any) => t.isDefault)) {
            setSelectedId(data.find((t: any) => t.isDefault)?.id);
        }
    };

    const handleSelect = async (templateId: string) => {
        setLoading(true);
        try {
            const res = await updateSchoolAdmissionTemplate(schoolId, templateId);
            if (res.success) {
                setSelectedId(templateId);
                toast.success("Admission form design updated successfully!");
            } else {
                toast.error("Failed to update design");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map((tmpl) => (
                    <Card
                        key={tmpl.id}
                        className={`relative overflow-hidden cursor-pointer transition-all duration-300 border-2 ${selectedId === tmpl.id
                                ? 'border-indigo-600 ring-2 ring-indigo-600/10 shadow-lg'
                                : 'border-slate-100 hover:border-indigo-200'
                            }`}
                        onClick={() => setSelectedId(tmpl.id)}
                    >
                        {selectedId === tmpl.id && (
                            <div className="absolute top-4 right-4 z-10">
                                <CheckCircle className="h-6 w-6 text-indigo-600 fill-indigo-50" />
                            </div>
                        )}
                        <CardHeader className="p-6 pb-2">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                                <Palette size={24} />
                            </div>
                            <CardTitle className="text-xl font-bold">{tmpl.name}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-2">{tmpl.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-4 flex flex-col gap-4">
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl">
                                <span>{tmpl.config.filter(c => c.visible).length} Fields</span>
                                <span>{tmpl.config.filter(c => c.required).length} Required</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 rounded-xl"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewTemplate(tmpl);
                                    }}
                                >
                                    <Eye className="mr-2 h-4 w-4" /> Preview
                                </Button>
                                <Button
                                    disabled={loading || selectedId === tmpl.id}
                                    size="sm"
                                    className={`flex-1 rounded-xl ${selectedId === tmpl.id
                                            ? 'bg-emerald-500 text-white cursor-default'
                                            : 'bg-slate-900 text-white'
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(tmpl.id);
                                    }}
                                >
                                    {selectedId === tmpl.id ? 'Active' : 'Select Design'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {previewTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-[2.5rem] shadow-2xl">
                        <CardHeader className="p-8 border-b bg-indigo-600 text-white flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black">Design Preview: {previewTemplate.name}</CardTitle>
                                <CardDescription className="text-indigo-100 font-medium">This is how your registration form will appear to parents.</CardDescription>
                            </div>
                            <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-12 w-12 p-0" onClick={() => setPreviewTemplate(null)}>
                                <CheckCircle className="h-8 w-8 rotate-45" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-8 overflow-y-auto bg-slate-50/50">
                            <AdmissionFormPreview config={previewTemplate.config} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
