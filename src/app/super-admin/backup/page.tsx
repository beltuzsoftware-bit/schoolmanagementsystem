'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Database,
    Plus,
    Download,
    RefreshCw,
    Trash2,
    UploadCloud,
    Key,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileArchive
} from 'lucide-react';
import {
    getBackups,
    createBackup,
    deleteBackup,
    restoreBackup,
    uploadBackup,
    getCronSecretKey,
    generateCronSecretKey,
    BackupFile
} from '@/app/actions/backup';

export default function BackupPage() {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [cronKey, setCronKey] = useState<string>('');
    const [showKey, setShowKey] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Dialog state
    const [confirmRestoreFile, setConfirmRestoreFile] = useState<string | null>(null);
    const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);

    // Upload state
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [uploading, setUploading] = useState<boolean>(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const list = await getBackups();
            setBackups(list);
            const key = await getCronSecretKey();
            setCronKey(key);
        } catch (error) {
            console.error('Failed to load backup data', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateBackup() {
        setActionLoading(true);
        setActionMessage(null);
        try {
            const res = await createBackup();
            if (res.success) {
                setActionMessage({ type: 'success', text: res.message || 'Backup created successfully!' });
                const list = await getBackups();
                setBackups(list);
            } else {
                setActionMessage({ type: 'error', text: res.error || 'Failed to create backup' });
            }
        } catch (error) {
            setActionMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setActionLoading(false);
        }
    }

    async function handleConfirmDelete() {
        if (!confirmDeleteFile) return;
        setActionLoading(true);
        try {
            const res = await deleteBackup(confirmDeleteFile);
            if (res.success) {
                setActionMessage({ type: 'success', text: `Backup ${confirmDeleteFile} has been deleted.` });
                setBackups(prev => prev.filter(b => b.name !== confirmDeleteFile));
            } else {
                setActionMessage({ type: 'error', text: res.error || 'Failed to delete backup' });
            }
        } catch (error) {
            setActionMessage({ type: 'error', text: 'Failed to delete backup.' });
        } finally {
            setActionLoading(false);
            setConfirmDeleteFile(null);
        }
    }

    async function handleConfirmRestore() {
        if (!confirmRestoreFile) return;
        setActionLoading(true);
        setActionMessage(null);
        try {
            const res = await restoreBackup(confirmRestoreFile);
            if (res.success) {
                setActionMessage({ type: 'success', text: res.message || 'System restore completed successfully!' });
            } else {
                setActionMessage({ type: 'error', text: res.error || 'Restoration failed' });
            }
        } catch (error) {
            setActionMessage({ type: 'error', text: 'An error occurred during restoration.' });
        } finally {
            setActionLoading(false);
            setConfirmRestoreFile(null);
        }
    }

    async function handleRegenerateKey() {
        try {
            const key = await generateCronSecretKey();
            setCronKey(key);
            setActionMessage({ type: 'success', text: 'Cron Secret Key regenerated successfully!' });
        } catch (error) {
            setActionMessage({ type: 'error', text: 'Failed to regenerate key.' });
        }
    }

    // Drag-and-drop Handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        if (!file.name.endsWith('.zip')) {
            setActionMessage({ type: 'error', text: 'Only .zip backup archive files are supported.' });
            return;
        }

        setUploading(true);
        setActionMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await uploadBackup(formData);
            if (res.success) {
                setActionMessage({ type: 'success', text: `Backup file "${file.name}" uploaded successfully.` });
                const list = await getBackups();
                setBackups(list);
            } else {
                setActionMessage({ type: 'error', text: res.error || 'Failed to upload backup' });
            }
        } catch (error) {
            setActionMessage({ type: 'error', text: 'Upload failed.' });
        } finally {
            setUploading(false);
        }
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Database className="h-8 w-8 text-indigo-600" />
                        Backup & Restore
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Create portable zipped backups of the system, download archives, or rollback database & code states.
                    </p>
                </div>
                <Button
                    onClick={handleCreateBackup}
                    disabled={actionLoading || uploading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none h-11 px-5 rounded-xl font-bold transition-all duration-300"
                >
                    {actionLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Database className="mr-2 h-5 w-5" />
                    )}
                    {actionLoading ? 'Creating Backup...' : 'Create Backup'}
                </Button>
            </div>

            {/* Notification Bar */}
            {actionMessage && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm animate-in slide-in-from-top-2 duration-300 ${
                    actionMessage.type === 'success'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                }`}>
                    {actionMessage.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm font-semibold">{actionMessage.text}</span>
                </div>
            )}

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Backup History List */}
                <Card className="lg:col-span-2 shadow-sm rounded-2xl border-slate-100 dark:border-slate-800 overflow-hidden">
                    <CardHeader className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10">
                        <CardTitle className="text-xl font-black text-slate-800 dark:text-slate-100">Backup History</CardTitle>
                        <CardDescription>All portable backups stored on the local server directory.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                                <span className="text-sm font-semibold">Scanning backup directory...</span>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                <div className="bg-indigo-50 dark:bg-slate-900 p-4 rounded-full">
                                    <FileArchive className="h-10 w-10 text-indigo-400" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200">No Backups Found</h3>
                                    <p className="text-xs text-slate-400 mt-1">Create your first backup or drag a ZIP to upload.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                                            <TableHead className="pl-6 py-4 font-bold text-slate-500">Filename</TableHead>
                                            <TableHead className="py-4 font-bold text-slate-500">Size</TableHead>
                                            <TableHead className="py-4 font-bold text-slate-500">Created At</TableHead>
                                            <TableHead className="pr-6 py-4 font-bold text-slate-500 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {backups.map((b) => (
                                            <TableRow key={b.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-slate-100 dark:border-slate-800">
                                                <TableCell className="pl-6 py-4 font-semibold text-slate-700 dark:text-slate-200 max-w-xs truncate">
                                                    {b.name}
                                                </TableCell>
                                                <TableCell className="py-4 font-medium text-slate-600 dark:text-slate-400">
                                                    <Badge variant="secondary" className="font-semibold bg-slate-100 dark:bg-slate-800">
                                                        {b.sizeMb} MB
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4 text-xs font-semibold text-slate-500">
                                                    {formatDate(b.createdAt)}
                                                </TableCell>
                                                <TableCell className="pr-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Download Link */}
                                                        <a href={`/${b.name}`} download={b.name}>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                                            >
                                                                <Download className="h-3.5 w-3.5 mr-1" />
                                                                Download
                                                            </Button>
                                                        </a>

                                                        {/* Restore Button */}
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setConfirmRestoreFile(b.name)}
                                                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                        >
                                                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                                            Restore
                                                        </Button>

                                                        {/* Delete Button */}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setConfirmDeleteFile(b.name)}
                                                            className="h-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Upload Zone & Cron Settings */}
                <div className="space-y-6">
                    {/* Upload Box */}
                    <Card className="shadow-sm rounded-2xl border-slate-100 dark:border-slate-800 overflow-hidden">
                        <CardHeader className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10">
                            <CardTitle className="text-xl font-black text-slate-800 dark:text-slate-100">Upload Backup</CardTitle>
                            <CardDescription>Drag and drop a zipped backup to save it in server storage.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                                    dragActive
                                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/15'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <input
                                    type="file"
                                    id="backup-file-input"
                                    className="hidden"
                                    accept=".zip"
                                    onChange={handleFileInput}
                                    disabled={uploading}
                                />
                                {uploading ? (
                                    <div className="space-y-3">
                                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
                                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Uploading and saving ZIP backup...</div>
                                    </div>
                                ) : (
                                    <label htmlFor="backup-file-input" className="cursor-pointer space-y-4 w-full">
                                        <div className="bg-indigo-50 dark:bg-slate-900 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto transition-transform hover:scale-110">
                                            <UploadCloud className="h-7 w-7 text-indigo-500" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-indigo-600 hover:underline">Click to upload</span>
                                            <span className="text-sm text-slate-500"> or drag and drop</span>
                                            <p className="text-xs text-slate-400 mt-1">Accepts only .zip backup files</p>
                                        </div>
                                    </label>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Cron Key Settings */}
                    <Card className="shadow-sm rounded-2xl border-slate-100 dark:border-slate-800 overflow-hidden">
                        <CardHeader className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10">
                            <CardTitle className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Key className="h-5 w-5 text-indigo-500" />
                                Cron Secret Key
                            </CardTitle>
                            <CardDescription>Secret header authorization token used for setting up automated backup crons.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="relative flex items-center">
                                <Input
                                    type={showKey ? 'text' : 'password'}
                                    value={cronKey}
                                    readOnly
                                    className="font-mono text-sm bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 pr-10 h-11 rounded-xl"
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    type="button"
                                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleRegenerateKey}
                                className="w-full border-slate-200 dark:border-slate-800 font-bold h-10 rounded-xl"
                            >
                                Regenerate Key
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirm Delete Dialog */}
            <Dialog open={!!confirmDeleteFile} onOpenChange={() => setConfirmDeleteFile(null)}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Delete Backup</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 mt-2">
                            Are you sure you want to permanently delete <span className="font-semibold text-slate-800 dark:text-slate-200">{confirmDeleteFile}</span>? This file cannot be recovered.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="outline" onClick={() => setConfirmDeleteFile(null)} className="font-semibold rounded-xl">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl">
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Restore Dialog */}
            <Dialog open={!!confirmRestoreFile} onOpenChange={() => setConfirmRestoreFile(null)}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Restore System Backup</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 mt-2">
                            Warning: Restoring from <span className="font-semibold text-slate-800 dark:text-slate-200">{confirmRestoreFile}</span> will overwrite the active filesystem and rollback all database student/school records to the date the backup was taken.
                            <br /><br />
                            A temporary backup of your current database state will be generated automatically for your safety.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="outline" onClick={() => setConfirmRestoreFile(null)} className="font-semibold rounded-xl">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmRestore} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
                            Confirm Restoration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
