'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertCircle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { importStaffMembers } from '@/app/actions';

const formatScientificNumber = (val: string | undefined | number): string => {
    if (val === undefined || val === null) return '';
    const cleanStr = String(val).trim();
    if (/^[+\-]?\d+(\.\d+)?[eE][+\-]?\d+$/.test(cleanStr)) {
        try {
            const num = Number(cleanStr);
            if (!isNaN(num)) {
                return num.toFixed(0);
            }
        } catch (e) {
            // fallback
        }
    }
    return cleanStr;
};

const normalizeDateToYYYYMMDD = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();
    if (!cleanStr) return '';

    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr;
    }

    // Try parsing DD/MM/YY or DD/MM/YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        let year = dmyMatch[3];
        if (year.length === 2) {
            const yNum = parseInt(year);
            year = yNum >= 70 ? `19${year}` : `20${year}`;
        }
        return `${year}-${month}-${day}`;
    }

    // Try parsing YY/MM/DD or YYYY/MM/DD
    const ymdMatch = cleanStr.match(/^(\d{2}|\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (ymdMatch) {
        let year = ymdMatch[1];
        if (year.length === 2) {
            const yNum = parseInt(year);
            year = yNum >= 70 ? `19${year}` : `20${year}`;
        }
        const month = ymdMatch[2].padStart(2, '0');
        const day = ymdMatch[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Try JavaScript Date parser as fallback
    try {
        const parsed = new Date(cleanStr);
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        // ignore
    }

    return cleanStr;
};

interface ImportStaffModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolId: string;
}

export function ImportStaffModal({ open, onClose, onSuccess, schoolId }: ImportStaffModalProps) {
    const [importing, setImporting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const columns = [
            'First Name', 'Last Name', 'Email', 'Phone Number', 'Alternate Phone', 'WhatsApp Number',
            'DOB', 'Aadhar Number', 'Gender', 'Husband Name', 'Father Name', 'Mother Name', 'Nationality', 'Religion',
            'Category', 'Marital Status', 'Last Org Name', 'Last Job Position', 'Years of Experience',
            'Qualification 1', 'College/University 1', 'Passing Year 1', 'Document 1',
            'Qualification 2', 'College/University 2', 'Passing Year 2', 'Document 2',
            'Pincode', 'City', 'State', 'Country', 'Full Address', 'Account Holder Name', 'Bank Name',
            'IFSC Code', 'Account Number', 'PAN Number', 'PF Account Number', 'UAN Number', 'Select Role',
            'Joining Date', 'Employee ID', 'Designation', 'Department', 'Payment Mode', 'Username',
            'Password', 'Salary', 'PF Rate', 'ESI Rate'
        ];
        
        const demoRowValues = [
            'John', 'Doe', 'john.doe@school.com', '9876543210', '9876543211', '9876543210',
            '1990-05-15', '123456789012', 'Male', '', 'Robert Doe', 'Sarah Doe', 'INDIAN', 'Hindu',
            'General', 'Married', 'Previous School', 'Teacher', '5',
            'MCA', 'Delhi University', '2018', '',
            'BCA', 'IGNOU', '2015', '',
            '110001', 'New Delhi', 'Delhi', 'India', '123 Street Address', 'John Doe', 'State Bank of India',
            'SBIN0000001', '10020030040', 'ABCDE1234F', 'PF1234567', 'UAN123456789', 'TEACHER',
            '2026-07-01', 'EMP-101', 'Teacher', 'Academic', 'Bank Transfer', 'john.doe',
            'password123', '45000', '12', '0.75'
        ];
        
        const headers = columns.join(',');
        const demoRow = demoRowValues.map(val => {
            if (val.includes(',') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',');

        const csvContent = headers + '\n' + demoRow + '\n';
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'staff_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            toast.error('Only CSV files are supported');
            return;
        }

        setValidationErrors([]);
        setImporting(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                
                // Character-by-character CSV parser
                const parseCsv = (csvText: string): string[][] => {
                    const result: string[][] = [];
                    let row: string[] = [];
                    let currentVal = '';
                    let insideQuotes = false;
                    
                    for (let i = 0; i < csvText.length; i++) {
                        const char = csvText[i];
                        const nextChar = csvText[i + 1];
                        
                        if (char === '"') {
                            if (insideQuotes && nextChar === '"') {
                                currentVal += '"';
                                i++;
                            } else {
                                insideQuotes = !insideQuotes;
                            }
                        } else if (char === ',' && !insideQuotes) {
                            row.push(currentVal);
                            currentVal = '';
                        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
                            if (char === '\r' && nextChar === '\n') {
                                i++;
                            }
                            row.push(currentVal);
                            if (row.some(val => val.trim() !== '')) {
                                result.push(row);
                            }
                            row = [];
                            currentVal = '';
                        } else {
                            currentVal += char;
                        }
                    }
                    if (currentVal !== '' || row.length > 0) {
                        row.push(currentVal);
                        if (row.some(val => val.trim() !== '')) {
                            result.push(row);
                        }
                    }
                    return result;
                };

                const parsedRows = parseCsv(text);
                if (parsedRows.length < 2) {
                    throw new Error('File is empty or missing data rows');
                }

                // First row is headers
                const headers = parsedRows[0].map(h => h.trim().toLowerCase());
                
                // Helper to get column index from possible synonyms
                const getColIndex = (names: string[]): number => {
                    return headers.findIndex(h => names.some(name => h.includes(name)));
                };

                const firstIdx = getColIndex(['first name']);
                const lastIdx = getColIndex(['last name']);
                const emailIdx = getColIndex(['email']);
                const phoneIdx = getColIndex(['phone number', 'phone']);
                const altPhoneIdx = getColIndex(['alternate phone', 'alt phone']);
                const whatsappIdx = getColIndex(['whatsapp']);
                const dobIdx = getColIndex(['dob', 'date of birth']);
                const aadharIdx = getColIndex(['aadhar']);
                const genderIdx = getColIndex(['gender']);
                const husbandIdx = getColIndex(['husband name', 'husband']);
                const fatherIdx = getColIndex(['father name', 'father']);
                const motherIdx = getColIndex(['mother name', 'mother']);
                const nationalityIdx = getColIndex(['nationality']);
                const religionIdx = getColIndex(['religion']);
                const categoryIdx = getColIndex(['category']);
                const maritalIdx = getColIndex(['marital status', 'marital']);
                const lastOrgIdx = getColIndex(['last org name', 'last org']);
                const lastJobIdx = getColIndex(['last job position', 'last job']);
                const yearsExpIdx = getColIndex(['years of experience', 'years exp', 'experience']);
                const q1NameIdx = getColIndex(['qualification 1', 'qual 1']);
                const q1CollegeIdx = getColIndex(['college/university 1', 'college 1', 'university 1']);
                const q1YearIdx = getColIndex(['passing year 1', 'year 1']);
                const q1DocIdx = getColIndex(['document 1', 'doc 1']);
                const q2NameIdx = getColIndex(['qualification 2', 'qual 2']);
                const q2CollegeIdx = getColIndex(['college/university 2', 'college 2', 'university 2']);
                const q2YearIdx = getColIndex(['passing year 2', 'year 2']);
                const q2DocIdx = getColIndex(['document 2', 'doc 2']);
                const pincodeIdx = getColIndex(['pincode']);
                const cityIdx = getColIndex(['city']);
                const stateIdx = getColIndex(['state']);
                const countryIdx = getColIndex(['country']);
                const fullAddressIdx = getColIndex(['full address', 'address']);
                const accHolderIdx = getColIndex(['account holder name', 'account holder', 'acc holder']);
                const bankNameIdx = getColIndex(['bank name']);
                const ifscIdx = getColIndex(['ifsc code', 'ifsc']);
                const accNoIdx = getColIndex(['account number', 'account no', 'acc no']);
                const panNoIdx = getColIndex(['pan number', 'pan no', 'pan']);
                const pfAccNoIdx = getColIndex(['pf account number', 'pf acc no', 'pf acc']);
                const uanNoIdx = getColIndex(['uan number', 'uan no', 'uan']);
                const roleIdx = getColIndex(['select role', 'role']);
                const joiningDateIdx = getColIndex(['joining date', 'joining']);
                const staffIdIdx = getColIndex(['employee id', 'staff id', 'emp id']);
                const desigIdx = getColIndex(['designation']);
                const deptIdx = getColIndex(['department', 'dept']);
                const paymentModeIdx = getColIndex(['payment mode']);
                const usernameIdx = getColIndex(['username']);
                const passwordIdx = getColIndex(['password']);
                const salaryIdx = getColIndex(['salary']);
                const pfRateIdx = getColIndex(['pf rate']);
                const esiRateIdx = getColIndex(['esi rate']);

                if (firstIdx === -1 || emailIdx === -1) {
                    throw new Error('Missing required headers. Ensure "First Name" and "Email" columns are present.');
                }

                const staffList = parsedRows.slice(1).map(row => {
                    const getVal = (idx: number) => (idx !== -1 && row[idx] ? row[idx].trim() : '');
                    
                    const qualifications = [];
                    const q1Name = getVal(q1NameIdx);
                    if (q1Name) {
                        qualifications.push({
                            name: q1Name,
                            college: getVal(q1CollegeIdx),
                            year: getVal(q1YearIdx),
                            document: getVal(q1DocIdx)
                        });
                    }
                    const q2Name = getVal(q2NameIdx);
                    if (q2Name) {
                        qualifications.push({
                            name: q2Name,
                            college: getVal(q2CollegeIdx),
                            year: getVal(q2YearIdx),
                            document: getVal(q2DocIdx)
                        });
                    }

                    return {
                        firstName: getVal(firstIdx),
                        lastName: getVal(lastIdx),
                        email: getVal(emailIdx),
                        phone: formatScientificNumber(getVal(phoneIdx)),
                        altPhone: formatScientificNumber(getVal(altPhoneIdx)),
                        whatsapp: formatScientificNumber(getVal(whatsappIdx)),
                        dob: normalizeDateToYYYYMMDD(getVal(dobIdx)),
                        aadhar: formatScientificNumber(getVal(aadharIdx)),
                        gender: getVal(genderIdx) || 'Male',
                        husbandName: getVal(husbandIdx),
                        fatherName: getVal(fatherIdx),
                        motherName: getVal(motherIdx),
                        nationality: getVal(nationalityIdx) || 'INDIAN',
                        religion: getVal(religionIdx),
                        category: getVal(categoryIdx),
                        maritalStatus: getVal(maritalIdx),
                        lastOrg: getVal(lastOrgIdx),
                        lastJob: getVal(lastJobIdx),
                        yearsExp: getVal(yearsExpIdx),
                        pincode: getVal(pincodeIdx),
                        city: getVal(cityIdx),
                        state: getVal(stateIdx),
                        country: getVal(countryIdx),
                        fullAddress: getVal(fullAddressIdx),
                        accHolder: getVal(accHolderIdx),
                        bankName: getVal(bankNameIdx),
                        ifsc: getVal(ifscIdx),
                        accNo: getVal(accNoIdx),
                        panNo: getVal(panNoIdx),
                        pfAccNo: getVal(pfAccNoIdx),
                        uanNo: getVal(uanNoIdx),
                        role: getVal(roleIdx),
                        joiningDate: normalizeDateToYYYYMMDD(getVal(joiningDateIdx)),
                        staffId: getVal(staffIdIdx),
                        designation: getVal(desigIdx),
                        department: getVal(deptIdx),
                        paymentMode: getVal(paymentModeIdx),
                        username: getVal(usernameIdx),
                        password: getVal(passwordIdx),
                        salary: Number(getVal(salaryIdx)) || 0,
                        pfRate: Number(getVal(pfRateIdx)) || 12,
                        esiRate: Number(getVal(esiRateIdx)) || 0.75,
                        qualifications
                    };
                });

                const res = await importStaffMembers(schoolId, staffList);
                if (res.success) {
                    toast.success(`Successfully imported ${res.count} staff members!`);
                    onSuccess();
                    onClose();
                } else if (res.errors) {
                    setValidationErrors(res.errors);
                    toast.error('Validation errors found in the file');
                } else {
                    toast.error(res.error || 'Failed to import staff members');
                }
            } catch (err: any) {
                toast.error(err.message || 'Error processing CSV file');
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 shadow-2xl p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <FileSpreadsheet className="text-indigo-600" /> Bulk Import Staff
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 uppercase tracking-widest text-[10px] font-black leading-normal mt-1">
                        Upload a CSV file containing staff credentials and information to add them in bulk
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border flex items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">1. Download CSV Template</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Use our predefined structure to format your spreadsheet correctly.</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={downloadTemplate}
                            className="bg-white hover:bg-slate-100 font-bold border-slate-200"
                        >
                            <Download className="mr-2 h-4 w-4" /> Download Template
                        </Button>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">2. Upload Formatted CSV File</h4>
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                                dragActive 
                                    ? 'border-indigo-500 bg-indigo-50/20' 
                                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                            }`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept=".csv" 
                                onChange={handleFileChange} 
                                disabled={importing}
                            />
                            {importing ? (
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                    <p className="text-sm font-bold text-slate-700">Validating and importing staff data...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-1">
                                        <Upload className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">Drag & drop your CSV file here, or <span className="text-indigo-600">browse</span></p>
                                    <p className="text-xs text-slate-400">Supported formats: CSV (.csv)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {validationErrors.length > 0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                                <AlertCircle size={16} /> Import Failures ({validationErrors.length})
                            </div>
                            <p className="text-xs text-rose-600">Please fix the following errors in your CSV file and try again:</p>
                            <div className="max-h-40 overflow-y-auto divide-y divide-rose-100/50 text-xs text-rose-700 font-semibold space-y-1 mt-1 pr-2">
                                {validationErrors.map((err, idx) => (
                                    <div key={idx} className="py-1 flex gap-2">
                                        <span>•</span>
                                        <span>{err}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
