"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
    HardDrive, 
    Database, 
    Download, 
    RefreshCw, 
    CheckCircle2, 
    AlertTriangle, 
    Server, 
    ShieldCheck, 
    FolderArchive, 
    Loader2, 
    FileImage,
    Sparkles,
    Activity
} from "lucide-react";

interface SystemHealthData {
    status: string;
    timestamp: string;
    storage: {
        volumeMounted: boolean;
        path: string;
        totalBytes: number;
        totalMb: string;
        fileCount: number;
        subfolders: Record<string, number>;
    };
    database: {
        totalStudents: number;
        photosLinked: number;
        photosMissing: number;
        healthPercentage: number;
        dbSizeBytes: number;
        dbSizeKb: string;
        lastModified: string | null;
    };
}

export default function SystemHealthPage() {
    const [data, setData] = useState<SystemHealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
    const [isHealing, setIsHealing] = useState(false);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/system-health');
            if (!res.ok) throw new Error('Failed to fetch system metrics');
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            console.error('Metrics fetch error:', e);
            toast.error(e.message || 'Failed to load system metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    // 1-Click Full System Snapshot
    const handleDownloadFullBackup = async () => {
        setIsDownloadingBackup(true);
        toast.info("Assembling complete system snapshot (data.json + data-images)...");

        try {
            const res = await fetch('/api/system-health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'backup' })
            });

            if (!res.ok) throw new Error('Failed to generate full system backup');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `KuMMi_Full_System_Backup_${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast.success("Full system snapshot downloaded successfully!");
        } catch (e: any) {
            console.error('Backup error:', e);
            toast.error(e.message || 'Failed to download system backup');
        } finally {
            setIsDownloadingBackup(false);
        }
    };

    // Self Healing Sync
    const handleRunSelfHealing = async () => {
        setIsHealing(true);
        toast.info("Running automated image migration & self-healing...");

        try {
            const res = await fetch('/api/migrate-images');
            const json = await res.json();
            if (json.success) {
                toast.success(`Self-healing completed! Moved ${json.moved || 0} images into persistent storage.`);
                await fetchMetrics();
            } else {
                toast.error(json.error || 'Self-healing failed');
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to run image repair');
        } finally {
            setIsHealing(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans pb-16">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-emerald-600" /> Storage Volume & System Health
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Real-time diagnostics for Docker persistent volumes, student media integrity, and 1-click disaster recovery.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={fetchMetrics}
                        className="gap-1.5 text-xs font-bold h-9"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isHealing}
                        onClick={handleRunSelfHealing}
                        className="gap-1.5 text-xs font-bold h-9 border-amber-300 text-amber-800 hover:bg-amber-50"
                    >
                        {isHealing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                        Self-Healing Sync
                    </Button>
                    <Button
                        size="sm"
                        disabled={isDownloadingBackup}
                        onClick={handleDownloadFullBackup}
                        className="gap-1.5 text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        {isDownloadingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Download Full System Snapshot (ZIP)
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Storage Volume Card */}
                <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="h-1.5 bg-indigo-600 w-full absolute top-0 left-0" />
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-indigo-600" /> Persistent Volume
                            </CardTitle>
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold border-0 text-[10px]">
                                Mounted
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">Docker `/app/data-images` host mount</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="text-3xl font-black text-slate-900">{data?.storage.totalMb || "0"} MB</span>
                            <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                                Total Storage Used on Host Disk
                            </span>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Total Files on Disk:</span>
                                <span className="font-bold text-slate-900">{data?.storage.fileCount || 0}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Student Photos:</span>
                                <span className="font-bold text-slate-900">{data?.storage.subfolders?.students || 0}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Staff Photos:</span>
                                <span className="font-bold text-slate-900">{data?.storage.subfolders?.staff || 0}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Templates & Badges:</span>
                                <span className="font-bold text-slate-900">{data?.storage.subfolders?.templates || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Media Integrity Card */}
                <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="h-1.5 bg-emerald-600 w-full absolute top-0 left-0" />
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FileImage className="w-4 h-4 text-emerald-600" /> Media Health
                            </CardTitle>
                            <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 font-bold border-0 text-[10px]">
                                {data?.database.healthPercentage}% Synced
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">Student record vs physical disk verification</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="text-3xl font-black text-slate-900">{data?.database.photosLinked || 0}</span>
                            <span className="text-xs text-slate-500 font-bold"> / {data?.database.totalStudents || 0} Students</span>
                            <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                                Valid Photos Verified on Server Disk
                            </span>
                        </div>

                        {/* Health Progress */}
                        <div className="space-y-1">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${data?.database.healthPercentage || 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                                <span>Missing: {data?.database.photosMissing || 0}</span>
                                <span>Status: {data?.database.photosMissing === 0 ? "100% Healthy" : "Recovery Recommended"}</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                            {data?.database.photosMissing === 0 ? (
                                <p className="text-emerald-700 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> All students have verified photos on disk!
                                </p>
                            ) : (
                                <p className="text-amber-700 font-medium">
                                    Use the <strong>"Restore Photos from ID Cards"</strong> tool in Student Info to link the remaining photos.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Database & Disaster Recovery */}
                <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="h-1.5 bg-amber-500 w-full absolute top-0 left-0" />
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Database className="w-4 h-4 text-amber-600" /> Database Vault
                            </CardTitle>
                            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 font-bold border-0 text-[10px]">
                                Active
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">Primary data store & disaster recovery</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="text-3xl font-black text-slate-900">{data?.database.dbSizeKb || "0"} KB</span>
                            <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                                Database JSON Size on Disk
                            </span>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                            <div className="flex justify-between">
                                <span>Engine:</span>
                                <span className="font-bold text-slate-900">KuMMi JSON Engine + Prisma</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Last Write:</span>
                                <span className="font-mono text-[10px] text-slate-700">
                                    {data?.database.lastModified ? new Date(data.database.lastModified).toLocaleTimeString() : "Recently"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Server Status:</span>
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Docker Volume Active
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Explanatory Banner */}
            <Card className="border-slate-200 bg-slate-50/60 shadow-sm">
                <CardContent className="p-4 text-xs text-slate-600 space-y-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Disaster Recovery & Redundancy Architecture
                    </h3>
                    <p>
                        All student profile pictures, staff portraits, and ID card templates are stored inside the persistent Docker host volume at <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/data-images</code>. This guarantees that deploying new features or rebuilding containers via Coolify will never unlink or erase school data.
                    </p>
                    <p>
                        Clicking <strong>"Download Full System Snapshot"</strong> creates a standalone, portable ZIP package containing both the full database (<code className="font-mono">data.json</code>) and all binary media files, allowing complete offline disaster recovery anytime.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
