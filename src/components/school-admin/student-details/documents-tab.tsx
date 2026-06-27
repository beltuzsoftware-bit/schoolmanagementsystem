'use client';

import React, { useState } from 'react';
import { 
    FileUp, Download, X, Search, Plus, 
    FileText, File as FileIcon, Trash2, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { addStudentDocument, deleteStudentDocument, updateStudentOfficialDocument } from '@/app/actions';
import { Student } from '@/types';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

interface DocumentsTabProps {
    student: Student;
}

export default function DocumentsTab({ student: initialStudent }: DocumentsTabProps) {
    const [student, setStudent] = useState(initialStudent);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [fileName, setFileName] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isReading, setIsReading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    // Official doc upload state
    const [isUploadingOfficial, setIsUploadingOfficial] = useState(false);
    const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
    const officialFileInputRef = React.useRef<HTMLInputElement>(null);

    const triggerDownload = (fileName: string, title: string, content?: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        let url: string;
        
        if (content) {
            // Use the real stored content
            url = content;
        } else {
            // Fallback to mock content if no real content is stored
            let blob: Blob;
            if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
                const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'image/png' });
            } else if (ext === 'pdf') {
                const pdfBase64 = 'JVBERi0xLjEKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqMiAwIG9iajw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+ZW5kb2JqMyAwIG9iajw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDQgMCBSPj4+Pi9Db250ZW50cyA1IDAgUj4+ZW5kb2JqNCAwIG9iajw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+ZW5kb2JqNSAwIG9iajw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDQgMCBSPj4+Pi9Db250ZW50cyA1IDAgUj4+ZW5kb2JqNCAwIG9iajw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+ZW5kb2JqNSAwIG9iajw8L0xlbmd0aCA0ND4+c3RyZWFtCkJULy9GMSAxMiBUZiAxMDAgNTAwIFRkIChLdU1NaSBTY2hvb2wgRVJQIC0gTW9jayBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTIgMDAwMDAgbiAKMDAwMDAwMDEwOCAwMDAwMCBuIAowMDAwMDAwMjEyIDAwMDAwIG4gCjAwMDAwMDAyOTYgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjM5MAolJUVPRgo=';
                const byteCharacters = atob(pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'application/pdf' });
            } else {
                const textContent = `Mock content for document: ${title}\nFilename: ${fileName}`;
                blob = new Blob([textContent], { type: 'text/plain' });
            }
            url = URL.createObjectURL(blob);
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.includes('.') ? fileName : `${fileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (!content) URL.revokeObjectURL(url);
        toast.success(`${content ? 'Real' : 'Mock'} ${ext?.toUpperCase() || 'File'} downloaded: ${fileName}`);
    };

    const handleUpload = async () => {
        if (!title || !fileName) {
            toast.error("Please provide both a title and an attachment");
            return;
        }

        setIsUploading(true);
        try {
            const res = await addStudentDocument(student.id, title, fileName, fileContent || undefined);
            if (res.success) {
                toast.success("Document uploaded successfully");
                // Update local state for immediate feedback
                const updatedDocs = [...(student.miscDocuments || []), { title, file: fileName, content: fileContent || undefined }];
                setStudent({ ...student, miscDocuments: updatedDocs });
                setIsUploadOpen(false);
                setTitle('');
                setFileName('');
                setFileContent(null);
            } else {
                toast.error(res.error || "Failed to upload document");
            }
        } catch (error) {
            toast.error("An error occurred during upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (index: number) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const res = await deleteStudentDocument(student.id, index);
            if (res.success) {
                toast.success("Document deleted");
                const updatedDocs = [...(student.miscDocuments || [])];
                updatedDocs.splice(index, 1);
                setStudent({ ...student, miscDocuments: updatedDocs });
            } else {
                toast.error(res.error || "Failed to delete");
            }
        } catch (error) {
            toast.error("An error occurred during deletion");
        }
    };

    const filteredDocs = (student.miscDocuments || []).filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOfficialUploadClick = (fieldName: string) => {
        setActiveFieldName(fieldName);
        officialFileInputRef.current?.click();
    };

    const handleOfficialFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeFieldName) return;

        // 2MB limit
        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size must be less than 2MB");
            return;
        }

        setIsUploadingOfficial(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target?.result as string;
                const fileName = file.name;

                const res = await updateStudentOfficialDocument(student.id, activeFieldName, fileName, content);
                if (res.success) {
                    toast.success("Document uploaded successfully");
                    
                    // Update local state correctly
                    const updatedStudent = { ...student };
                    (updatedStudent as any)[activeFieldName] = fileName;
                    
                    let contentField = activeFieldName + 'Content';
                    if (activeFieldName === 'categoryCertificate') {
                        contentField = 'categoryCertificateFileContent';
                    }
                    (updatedStudent as any)[contentField] = content;
                    
                    setStudent(updatedStudent);
                } else {
                    toast.error(res.error || "Upload failed");
                }
                setIsUploadingOfficial(false);
                setActiveFieldName(null);
                if (officialFileInputRef.current) officialFileInputRef.current.value = '';
            };
            reader.readAsDataURL(file);
        } catch (error) {
            toast.error("An error occurred during upload");
            setIsUploadingOfficial(false);
            setActiveFieldName(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 p-4">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-72 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16} />
                    <Input 
                        placeholder="Search documents..." 
                        className="pl-10 h-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button 
                    onClick={() => setIsUploadOpen(true)}
                    className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 gap-2 shadow-lg shadow-slate-200"
                >
                    <Plus size={16} />
                    Upload Documents
                </Button>
            </div>

            {/* Table 1: Miscellaneous Documents */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="px-6 py-4 w-12 text-[11px] font-black text-slate-800 uppercase tracking-wider text-center">#</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider">File Name</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDocs.length > 0 ? (
                                filteredDocs.map((doc, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-center text-xs font-black text-slate-400">
                                            {i + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                                                    <FileText size={18} />
                                                </div>
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{doc.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                            {doc.file}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                                                    title="Download"
                                                    onClick={() => triggerDownload(doc.file, doc.title, doc.content)}
                                                >
                                                    <Download size={16} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                                                    title="Delete"
                                                    onClick={() => handleDelete(i)}
                                                >
                                                    <X size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic text-sm">
                                        No documents found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Table 2: Digital Vault (Official Records) */}
            <div className="pt-8 border-t-2 border-slate-100">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-100">
                        <ShieldCheck className="text-white" size={16} />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Digital Vault</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Verified Official Identity Records</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 w-12 text-[11px] font-black text-slate-800 uppercase tracking-wider text-center">#</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider">Official Title</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider">File Name</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { title: 'Transfer Certificate (TC)', fieldName: 'tcFile', file: student.tcFile, content: student.tcFileContent },
                                    { title: 'National ID (Aadhar)', fieldName: 'attachAadhar', file: student.attachAadhar, content: student.attachAadharContent },
                                    { title: 'Category Certificate', fieldName: 'categoryCertificate', file: student.categoryCertificate, content: (student as any).categoryCertificateFileContent },
                                    { title: 'Father ID Proof', fieldName: 'fatherDocFile', file: student.fatherDocFile, content: student.fatherDocFileContent },
                                    { title: 'Mother ID Proof', fieldName: 'motherDocFile', file: student.motherDocFile, content: student.motherDocFileContent },
                                    { title: 'Guardian ID Proof', fieldName: 'guardianDocFile', file: student.guardianDocFile, content: student.guardianDocFileContent },
                                    { title: 'Student Govt ID', fieldName: 'govtStudentIdPhoto', file: student.govtStudentIdPhoto, content: student.govtStudentIdPhotoContent },
                                    { title: 'Family Govt ID', fieldName: 'govtFamilyIdPhoto', file: student.govtFamilyIdPhoto, content: student.govtFamilyIdPhotoContent }
                                ].map((doc, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-center text-xs font-black text-slate-400">
                                            {idx + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${doc.file || doc.content ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    <ShieldCheck size={16} />
                                                </div>
                                                <span className={`text-[11px] font-black uppercase tracking-tight ${doc.file || doc.content ? 'text-slate-800' : 'text-slate-500'}`}>
                                                    {doc.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-500 font-mono">
                                            {doc.file || (doc.content ? "VERIFIED_RECORD" : <span className="text-slate-300 font-normal italic">Not uploaded</span>)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {doc.file || doc.content ? (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                                        title="Download Official Record"
                                                        onClick={() => triggerDownload(doc.file || `${doc.title}.pdf`, doc.title, doc.content)}
                                                    >
                                                        <Download size={14} />
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        title="Upload Official Record"
                                                        disabled={isUploadingOfficial && activeFieldName === doc.fieldName}
                                                        onClick={() => handleOfficialUploadClick(doc.fieldName)}
                                                    >
                                                        {isUploadingOfficial && activeFieldName === doc.fieldName ? (
                                                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Upload size={14} />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="px-6 py-5 bg-slate-100 border-b border-slate-200">
                        <DialogTitle className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <FileUp className="text-teal-600" size={20} />
                            Upload Document
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Document Title</Label>
                            <Input 
                                placeholder="e.g. Admission Form" 
                                className="h-12 border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 text-sm font-black text-slate-900 uppercase"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Attachment</Label>
                            <div className="flex gap-3">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setFileName(file.name);
                                            setIsReading(true);
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                setFileContent(event.target?.result as string);
                                                setIsReading(false);
                                                toast.success("File processed & ready to save");
                                            };
                                            reader.onerror = () => {
                                                setIsReading(false);
                                                toast.error("Failed to read file");
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                <Input 
                                    placeholder="Click Select to choose a file" 
                                    className="h-12 border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 text-sm font-bold text-slate-800"
                                    value={fileName}
                                    readOnly
                                />
                                <Button 
                                    variant="outline" 
                                    className="h-12 px-6 font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 shrink-0 border-slate-200"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Select
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="px-6 py-5 bg-slate-100 border-t border-slate-200 flex gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsUploadOpen(false)}
                            className="text-xs font-black uppercase tracking-widest text-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpload}
                            disabled={isUploading || isReading || !fileName || !title}
                            className={cn(
                                "h-12 px-8 text-xs font-black uppercase tracking-widest shadow-lg transition-all",
                                isReading ? "bg-amber-500 hover:bg-amber-600" : "bg-teal-600 hover:bg-teal-700 shadow-teal-100"
                            )}
                        >
                            {isUploading ? "Uploading..." : isReading ? "Reading File..." : "Save Document"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Hidden inputs outside of dialogs */}
            <input 
                type="file" 
                ref={officialFileInputRef} 
                className="hidden" 
                onChange={handleOfficialFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
            />
        </div>
    );
}
