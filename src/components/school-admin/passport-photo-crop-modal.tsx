"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "@/types";
import { toast } from "sonner";
import { 
    Camera, 
    Upload, 
    Crop, 
    Check, 
    RotateCw, 
    ZoomIn, 
    ZoomOut, 
    User, 
    Loader2, 
    Scissors,
    Sparkles
} from "lucide-react";

interface PassportPhotoCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    defaultStudentId?: string;
    onSuccess: () => void;
}

export function PassportPhotoCropModal({
    isOpen,
    onClose,
    students,
    defaultStudentId,
    onSuccess
}: PassportPhotoCropModalProps) {
    const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId || "");
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Crop parameters (normalized percentages)
    // Default passport ratio 35:45 (approx 0.77 aspect ratio)
    const [cropX, setCropX] = useState<number>(20);
    const [cropY, setCropY] = useState<number>(10);
    const [cropWidth, setCropWidth] = useState<number>(60);
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedStudentId(defaultStudentId || (students[0]?.id || ""));
            setImageSrc(null);
            setPreviewDataUrl(null);
            setCropX(20);
            setCropY(10);
            setCropWidth(60);
        }
    }, [isOpen, defaultStudentId, students]);

    // Handle file input
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Auto-match student by filename if not already selected
        const filename = file.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matched = students.find(s => {
            if (s.admissionNumber && filename.includes(s.admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, ""))) return true;
            if (s.name && filename.includes(s.name.toLowerCase().replace(/[^a-z0-9]/g, ""))) return true;
            return false;
        });

        if (matched) {
            setSelectedStudentId(matched.id);
            toast.info(`Auto-matched with ${matched.name} (${matched.admissionNumber})`);
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Update real-time cropped preview
    useEffect(() => {
        if (!imageSrc) return;

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            imgRef.current = img;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const naturalW = img.naturalWidth;
            const naturalH = img.naturalHeight;

            // Target passport size: 350x450 px (35x45 mm ratio 7:9)
            const TARGET_W = 350;
            const TARGET_H = 450;
            canvas.width = TARGET_W;
            canvas.height = TARGET_H;

            // Source box
            const sw = (cropWidth / 100) * naturalW;
            const sh = sw * (TARGET_H / TARGET_W); // maintain 7:9 ratio
            const sx = (cropX / 100) * naturalW;
            const sy = (cropY / 100) * naturalH;

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
            setPreviewDataUrl(canvas.toDataURL("image/webp", 0.92));
        };
    }, [imageSrc, cropX, cropY, cropWidth]);

    // Save Cropped Photo
    const handleSave = async () => {
        if (!selectedStudentId) {
            toast.error("Please select a student for this photo");
            return;
        }
        if (!previewDataUrl) {
            toast.error("No cropped photo available");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/restore-photos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    updates: [
                        { studentId: selectedStudentId, photoBase64: previewDataUrl }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save photo");
            }

            toast.success("Passport photo saved and attached to student profile!");
            onSuccess();
            onClose();
        } catch (e: any) {
            console.error("Save photo error:", e);
            toast.error(e.message || "Failed to save photo");
        } finally {
            setIsSaving(false);
        }
    };

    const currentStudent = students.find(s => s.id === selectedStudentId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl font-sans p-6">
                <DialogHeader className="mb-2">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                            <Crop className="w-5 h-5" />
                        </span>
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-900">
                                Passport Photo Cropper & Optimizer
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Upload any raw photo, adjust the 35×45 mm passport frame, and save directly to the student profile.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Student Selector */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <Label className="text-xs font-bold text-slate-700 block mb-1">Select Student</Label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="Choose student..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                {students.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                        {s.name} ({s.admissionNumber || "No Adm"}) — {s.className || "Class"}-{s.section || "A"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!imageSrc ? (
                        /* Upload Zone */
                        <div
                            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
                            onClick={() => document.getElementById("passport-file-input")?.click()}
                        >
                            <input
                                id="passport-file-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-2">
                                <Camera className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Select Raw Student Photo</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">JPEG, PNG, or WebP. Any dimensions or camera orientation.</p>
                            <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8">
                                Browse Photo
                            </Button>
                        </div>
                    ) : (
                        /* Interactive Crop Interface */
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                            {/* Source Image with 35:45 Crop Box */}
                            <div className="sm:col-span-2 space-y-2">
                                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Drag & Adjust Crop Frame</span>
                                    <button
                                        onClick={() => setImageSrc(null)}
                                        className="text-[11px] text-indigo-600 hover:underline font-normal"
                                    >
                                        Choose Different Photo
                                    </button>
                                </Label>

                                <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-900 shadow-inner flex items-center justify-center p-2">
                                    <div className="relative inline-block max-w-full">
                                        <img
                                            src={imageSrc}
                                            alt="Source"
                                            className="max-h-64 w-auto rounded block"
                                        />
                                        {/* Passport Frame (Aspect 35:45) */}
                                        <div
                                            className="absolute border-2 border-emerald-400 bg-emerald-400/20 pointer-events-none rounded shadow-md"
                                            style={{
                                                left: `${cropX}%`,
                                                top: `${cropY}%`,
                                                width: `${cropWidth}%`,
                                                height: `${cropWidth * (45 / 35)}%`,
                                            }}
                                        >
                                            <span className="absolute -top-5 left-0 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                                35×45 mm Passport
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Slider Controls */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                                    <div className="flex justify-between font-bold text-slate-600">
                                        <span>Left (X): {cropX}%</span>
                                        <span>Top (Y): {cropY}%</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="range" min="0" max="60" value={cropX} onChange={e => setCropX(Number(e.target.value))} className="w-full h-1" />
                                        <input type="range" min="0" max="60" value={cropY} onChange={e => setCropY(Number(e.target.value))} className="w-full h-1" />
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-600 pt-1">
                                        <span>Frame Size: {cropWidth}%</span>
                                    </div>
                                    <input type="range" min="20" max="80" value={cropWidth} onChange={e => setCropWidth(Number(e.target.value))} className="w-full h-1" />
                                </div>
                            </div>

                            {/* Output Preview */}
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-700 block">Optimized Passport Photo</Label>
                                <div className="w-32 h-40 rounded-lg border-2 border-indigo-200 overflow-hidden bg-slate-100 flex items-center justify-center shadow-md mx-auto">
                                    {previewDataUrl ? (
                                        <img src={previewDataUrl} alt="Cropped Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-500 text-center space-y-0.5">
                                    <p className="font-bold text-slate-700">350 × 450 px (35×45 mm)</p>
                                    <p>Format: WebP | Size: ~28 KB</p>
                                    <p className="text-emerald-600 font-bold">Ready for ID Cards & Records</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-2">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        disabled={!imageSrc || !selectedStudentId || isSaving}
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-sm"
                    >
                        {isSaving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Check className="w-4 h-4" /> Save to Student Profile</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
