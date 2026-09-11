"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Student } from "@/types";
import { toast } from "sonner";
import { 
    Upload, 
    FileArchive, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Scissors, 
    RefreshCw, 
    Sparkles, 
    Image as ImageIcon,
    SlidersHorizontal,
    UserCheck,
    Check,
    ChevronRight
} from "lucide-react";
import JSZip from "jszip";

import { searchStudents } from "@/app/actions";

interface RecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    schoolId?: string;
    onSuccess: () => void;
}

interface MatchedCard {
    filename: string;
    student: Student;
    blob: Blob;
    dataUrl: string;
}

export function IdCardPhotoRecoveryModal({ isOpen, onClose, students, schoolId, onSuccess }: RecoveryModalProps) {
    const [step, setStep] = useState<'upload' | 'calibrate' | 'processing' | 'done'>('upload');
    const [isParsing, setIsParsing] = useState(false);
    const [matchedCards, setMatchedCards] = useState<MatchedCard[]>([]);
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    const [unmatchedSamples, setUnmatchedSamples] = useState<string[]>([]);

    // Crop box percentages (relative to the full card image)
    // Default optimized for "Heritage Model | horizontal | 86x54 mm"
    const [cropX, setCropX] = useState<number>(4);      // left %
    const [cropY, setCropY] = useState<number>(20);     // top %
    const [cropW, setCropW] = useState<number>(26);     // width %
    const [cropH, setCropH] = useState<number>(56);     // height %

    // Sample preview
    const [sampleIndex, setSampleIndex] = useState(0);
    const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

    // Processing progress
    const [progressCount, setProgressCount] = useState(0);
    const [totalToProcess, setTotalToProcess] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Reset when dialog opens
    useEffect(() => {
        if (isOpen) {
            setStep('upload');
            setMatchedCards([]);
            setUnmatchedCount(0);
            setUnmatchedSamples([]);
            setProgressCount(0);
            setSampleIndex(0);
            setCroppedPreviewUrl(null);
        }
    }, [isOpen]);

    // Handle File Drop / Selection
    const handleFiles = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        setIsParsing(true);
        toast.info("Reading ID card files...");

        try {
            const imageEntries: { filename: string; blob: Blob }[] = [];

            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                if (file.name.endsWith('.zip')) {
                    // Extract ZIP
                    const zip = await JSZip.loadAsync(file);
                    const filePromises: Promise<void>[] = [];

                    zip.forEach((relativePath, zipEntry) => {
                        if (!zipEntry.dir && /\.(png|jpg|jpeg|webp)$/i.test(relativePath)) {
                            filePromises.push(
                                zipEntry.async('blob').then(blob => {
                                    imageEntries.push({
                                        filename: relativePath.split('/').pop() || relativePath,
                                        blob,
                                    });
                                })
                            );
                        }
                    });

                    await Promise.all(filePromises);
                } else if (/\.(png|jpg|jpeg|webp)$/i.test(file.name)) {
                    imageEntries.push({ filename: file.name, blob: file });
                }
            }

            if (imageEntries.length === 0) {
                toast.error("No valid ID card images found in the uploaded file(s).");
                setIsParsing(false);
                return;
            }

            // Always attempt to get complete student roster if schoolId is available
            let studentPool: Student[] = students;
            if (schoolId) {
                try {
                    const fullRoster = (await searchStudents(schoolId, { status: 'all' })) as Student[];
                    if (fullRoster && fullRoster.length > 0) {
                        studentPool = fullRoster;
                    }
                } catch (e) {
                    console.warn("Could not fetch complete roster, using current page students:", e);
                }
            }

            if (!studentPool || studentPool.length === 0) {
                toast.error("No students found in the school database to match against.");
                setIsParsing(false);
                return;
            }

            // Match cards with students
            const matched: MatchedCard[] = [];
            const failedNames: string[] = [];
            let unmatched = 0;

            for (const entry of imageEntries) {
                const cleanName = entry.filename.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                // 1. Try match by Admission Number
                let matchedStudent = studentPool.find(s => {
                    if (!s.admissionNumber) return false;
                    const cleanAdm = s.admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return cleanAdm.length >= 2 && cleanName.includes(cleanAdm);
                });

                // 2. Try match by Student Name
                if (!matchedStudent) {
                    matchedStudent = studentPool.find(s => {
                        const nameParts = (s.name || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
                        if (nameParts.length >= 2) {
                            return cleanName.includes(nameParts[0]) && cleanName.includes(nameParts[1]);
                        }
                        if (nameParts.length === 1 && nameParts[0].length >= 3) {
                            return cleanName.includes(nameParts[0]);
                        }
                        return false;
                    });
                }

                // 3. Try match by Roll Number
                if (!matchedStudent) {
                    matchedStudent = studentPool.find(s => {
                        if (!s.rollNumber) return false;
                        const cleanRoll = s.rollNumber.toLowerCase().trim();
                        return cleanRoll.length >= 1 && (
                            cleanName.includes(`roll${cleanRoll}`) || 
                            cleanName.includes(`rollno${cleanRoll}`) ||
                            cleanName.includes(`_roll_${cleanRoll}_`)
                        );
                    });
                }

                if (matchedStudent) {
                    // Avoid duplicates if same student has multiple cards
                    if (!matched.some(m => m.student.id === matchedStudent!.id)) {
                        const dataUrl = await blobToDataUrl(entry.blob);
                        matched.push({
                            filename: entry.filename,
                            student: matchedStudent,
                            blob: entry.blob,
                            dataUrl,
                        });
                    }
                } else {
                    unmatched++;
                    if (failedNames.length < 5) {
                        failedNames.push(entry.filename);
                    }
                }
            }

            if (matched.length === 0) {
                const sampleFiles = imageEntries.slice(0, 3).map(e => e.filename).join(', ');
                toast.error(`Could not match any of the ${imageEntries.length} cards to student records. Found: [${sampleFiles}]`);
                setIsParsing(false);
                return;
            }

            setMatchedCards(matched);
            setUnmatchedCount(unmatched);
            setUnmatchedSamples(failedNames);
            setStep('calibrate');
            toast.success(`Matched ${matched.length} card(s) to student records!`);
        } catch (err: any) {
            console.error("Error reading cards:", err);
            toast.error(err.message || "Failed to process card archive");
        } finally {
            setIsParsing(false);
        }
    };

    // Helper: Blob to DataURL
    const blobToDataUrl = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Recompute sample preview whenever crop parameters or sampleIndex change
    useEffect(() => {
        if (step !== 'calibrate' || matchedCards.length === 0) return;
        const currentCard = matchedCards[sampleIndex] || matchedCards[0];
        if (!currentCard) return;

        const img = new Image();
        img.src = currentCard.dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const naturalW = img.naturalWidth;
            const naturalH = img.naturalHeight;

            const sx = (cropX / 100) * naturalW;
            const sy = (cropY / 100) * naturalH;
            const sw = (cropW / 100) * naturalW;
            const sh = (cropH / 100) * naturalH;

            canvas.width = Math.max(1, sw);
            canvas.height = Math.max(1, sh);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                setCroppedPreviewUrl(canvas.toDataURL('image/webp', 0.95));
            }
        };
    }, [step, matchedCards, sampleIndex, cropX, cropY, cropW, cropH]);

    // Crop a single image to Base64
    const cropCardImage = (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const naturalW = img.naturalWidth;
                const naturalH = img.naturalHeight;

                const sx = (cropX / 100) * naturalW;
                const sy = (cropY / 100) * naturalH;
                const sw = (cropW / 100) * naturalW;
                const sh = (cropH / 100) * naturalH;

                canvas.width = Math.max(1, sw);
                canvas.height = Math.max(1, sh);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                    resolve(canvas.toDataURL('image/webp', 0.92));
                } else {
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
        });
    };

    // Run Full Restoration
    const handleStartRestore = async () => {
        setStep('processing');
        setTotalToProcess(matchedCards.length);
        setProgressCount(0);

        const BATCH_SIZE = 20;
        let completed = 0;

        try {
            for (let i = 0; i < matchedCards.length; i += BATCH_SIZE) {
                const chunk = matchedCards.slice(i, i + BATCH_SIZE);
                const updates: { studentId: string; photoBase64: string }[] = [];

                for (const card of chunk) {
                    const croppedBase64 = await cropCardImage(card.dataUrl);
                    updates.push({
                        studentId: card.student.id,
                        photoBase64: croppedBase64,
                    });
                }

                // Send batch to server
                const res = await fetch('/api/restore-photos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to save photos to server');
                }

                completed += chunk.length;
                setProgressCount(completed);
            }

            setStep('done');
            toast.success(`Successfully restored all ${matchedCards.length} student photos!`);
            onSuccess();
        } catch (e: any) {
            console.error("Restoration error:", e);
            toast.error(e.message || "Failed to restore photos");
            setStep('calibrate');
        }
    };

    const currentSample = matchedCards[sampleIndex];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 font-sans">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                            <Scissors className="w-5 h-5" />
                        </span>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                Restore Photos from Printed ID Cards
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Extract student portraits directly from the school's ID Card ZIP or images into permanent storage.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* ── STEP 1: UPLOAD ── */}
                {step === 'upload' && (
                    <div className="space-y-6">
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleFiles(e.dataTransfer.files);
                            }}
                            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all rounded-2xl p-10 text-center flex flex-col items-center justify-center cursor-pointer group"
                            onClick={() => document.getElementById('id-cards-file-input')?.click()}
                        >
                            <input
                                id="id-cards-file-input"
                                type="file"
                                accept=".zip,.png,.jpg,.jpeg,.webp"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFiles(e.target.files)}
                            />
                            {isParsing ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                    <p className="text-sm font-bold text-slate-700">Unpacking ID Cards & Matching Students...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                        <FileArchive className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800 mb-1">
                                        Drop Student ID Cards ZIP or Card Images Here
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                                        Select the <span className="font-mono font-bold text-indigo-600">Student_ID_Cards.zip</span> downloaded from the ID Cards page, or multiple card PNG files.
                                    </p>
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                                        Browse File(s)
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-500" /> How It Works
                            </p>
                            <p>1. Automatically extracts every student card from the ZIP archive.</p>
                            <p>2. Matches each card with student records by Admission Number & Name.</p>
                            <p>3. Crops the student photo using the <strong>Heritage Model (86x54 mm)</strong> template coordinates.</p>
                            <p>4. Permanently saves the cropped photos to the Docker volume.</p>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: CALIBRATE CROP ── */}
                {step === 'calibrate' && currentSample && (
                    <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Matched <strong>{matchedCards.length}</strong> students ready for restoration!</span>
                            </div>
                            {unmatchedCount > 0 && (
                                <span className="text-slate-500">({unmatchedCount} files not matched)</span>
                            )}
                        </div>

                        {/* Split Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            {/* Card with Crop Box */}
                            <div className="md:col-span-2 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700">
                                        Sample Card ({sampleIndex + 1} of {matchedCards.length}): <span className="font-semibold text-indigo-600">{currentSample.student.name}</span>
                                    </Label>
                                    {matchedCards.length > 1 && (
                                        <div className="flex gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs px-2"
                                                disabled={sampleIndex <= 0}
                                                onClick={() => setSampleIndex(i => Math.max(0, i - 1))}
                                            >
                                                Prev
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs px-2"
                                                disabled={sampleIndex >= matchedCards.length - 1}
                                                onClick={() => setSampleIndex(i => Math.min(matchedCards.length - 1, i + 1))}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-900 shadow-sm flex items-center justify-center p-2">
                                    <div className="relative inline-block max-w-full">
                                        <img
                                            src={currentSample.dataUrl}
                                            alt="Sample Card"
                                            className="max-h-60 w-auto rounded border border-slate-700 block"
                                        />
                                        {/* Highlight Crop Box */}
                                        <div
                                            className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none rounded shadow-sm"
                                            style={{
                                                left: `${cropX}%`,
                                                top: `${cropY}%`,
                                                width: `${cropW}%`,
                                                height: `${cropH}%`,
                                            }}
                                        >
                                            <span className="absolute -top-5 left-0 bg-red-600 text-white text-[9px] font-bold px-1 rounded">
                                                Photo
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Result Thumbnail & Sliders */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs font-bold text-slate-700 block mb-1.5">Cropped Face Preview</Label>
                                    <div className="w-28 h-32 rounded-xl border-2 border-indigo-200 overflow-hidden bg-slate-100 flex items-center justify-center shadow-inner mx-auto">
                                        {croppedPreviewUrl ? (
                                            <img src={croppedPreviewUrl} alt="Cropped" className="w-full h-full object-cover" />
                                        ) : (
                                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                        )}
                                    </div>
                                </div>

                                {/* Preset Selector */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-slate-600">Template Preset</Label>
                                    <select
                                        className="w-full text-xs font-semibold p-1.5 border border-slate-200 rounded-lg bg-white"
                                        onChange={(e) => {
                                            if (e.target.value === 'heritage') {
                                                setCropX(4); setCropY(20); setCropW(26); setCropH(56);
                                            } else if (e.target.value === 'vertical') {
                                                setCropX(25); setCropY(12); setCropW(50); setCropH(38);
                                            }
                                        }}
                                    >
                                        <option value="heritage">Heritage Model (Horizontal 86×54 mm)</option>
                                        <option value="vertical">Vertical ID Card (54×86 mm)</option>
                                        <option value="custom">Custom Sliders</option>
                                    </select>
                                </div>

                                {/* Fine Tune Sliders */}
                                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                                    <div className="flex justify-between font-bold text-slate-600">
                                        <span>Left: {cropX}%</span>
                                        <span>Top: {cropY}%</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="range" min="0" max="60" value={cropX} onChange={e => setCropX(Number(e.target.value))} className="w-full h-1" />
                                        <input type="range" min="0" max="60" value={cropY} onChange={e => setCropY(Number(e.target.value))} className="w-full h-1" />
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-600 pt-1">
                                        <span>Width: {cropW}%</span>
                                        <span>Height: {cropH}%</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="range" min="10" max="50" value={cropW} onChange={e => setCropW(Number(e.target.value))} className="w-full h-1" />
                                        <input type="range" min="10" max="80" value={cropH} onChange={e => setCropH(Number(e.target.value))} className="w-full h-1" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                                Back to Upload
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold px-6 shadow-md"
                                onClick={handleStartRestore}
                            >
                                <Check className="w-4 h-4 mr-1.5" /> Start Photo Recovery ({matchedCards.length} Students)
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: PROCESSING ── */}
                {step === 'processing' && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <h3 className="text-lg font-bold text-slate-800">
                            Restoring Student Photos ({progressCount} / {totalToProcess})
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm">
                            Cropping card portraits and saving them directly into the persistent Docker volume...
                        </p>
                        <div className="w-full max-w-md bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <div
                                className="bg-indigo-600 h-full transition-all duration-300"
                                style={{ width: `${totalToProcess > 0 ? (progressCount / totalToProcess) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* ── STEP 4: DONE ── */}
                {step === 'done' && (
                    <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">
                            All Student Photos Successfully Restored!
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm">
                            {matchedCards.length} photos have been extracted, cropped, and saved to the server volume. All student profiles now display their original photos!
                        </p>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 mt-2"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
