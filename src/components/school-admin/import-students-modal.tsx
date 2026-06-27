'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { getAdmissionFormConfigForSchool, getTemplateDemoStudent, importStudentsBatch } from '@/app/actions';
import { StudentFormConfig } from '@/types';
import { toast } from 'sonner';

interface ImportStudentsModalProps {
    schoolId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportStudentsModal({ schoolId, onClose, onSuccess }: ImportStudentsModalProps) {
    const [config, setConfig] = useState<StudentFormConfig[]>([]);
    const [demoStudent, setDemoStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchConfigAndDemo = async () => {
            try {
                const [res, demoRes] = await Promise.all([
                    getAdmissionFormConfigForSchool(schoolId),
                    getTemplateDemoStudent(schoolId, "sarah james")
                ]);
                const filteredConfig = res.config.filter((f: any) => f.visible);
                // Always add studentType even if not in explicit config
                if (!filteredConfig.find((f: any) => f.fieldName === 'studentType')) {
                    filteredConfig.push({
                        fieldName: 'studentType',
                        label: 'Student Type (new/old)',
                        visible: true,
                        required: false
                    });
                }
                if (!filteredConfig.find((f: any) => f.fieldName === 'admissionNumber')) {
                    filteredConfig.unshift({
                        fieldName: 'admissionNumber',
                        label: 'Admission Number',
                        visible: true,
                        required: false
                    });
                }
                setConfig(filteredConfig);
                if (demoRes) {
                    setDemoStudent({ ...demoRes, studentType: 'old' });
                }
            } catch (error) {
                toast.error('Failed to load admission configuration');
            } finally {
                setLoading(false);
            }
        };
        fetchConfigAndDemo();
    }, [schoolId]);

    const [downloadUrl, setDownloadUrl] = useState<string>('#');

    useEffect(() => {
        if (!config.length) return;
        
        // Helper to format CSV cell securely
        const formatCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;

        // Generate CSV headers based on SCHOOL-DEFINED labels for user-friendly templates
        const headers = config.map(f => formatCell(f.label)).join(',');
        
        // Helper to map fields safely without false positives
        const getDemoValue = (f: any, rowIndex: 1 | 2) => {
            const rawField = f.fieldName;

            // Prioritize the real student manually entered by the user
            if (rowIndex === 1 && demoStudent) {
                const realValue = demoStudent[rawField];
                if (realValue !== undefined && realValue !== null && realValue !== '') {
                    const strVal = realValue.toString();
                    
                    const lowerField = rawField.toLowerCase();
                    const isDateLike = lowerField.includes('date') || lowerField === 'dob' || strVal.match(/^\d{4}-\d{2}-\d{2}$/);
                    
                    let finalVal = strVal;

                    // Strictly convert database YYYY-MM-DD dates to standard DD-MM-YYYY for user friendly manipulation
                    if (strVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [y, m, d] = strVal.split('-');
                        finalVal = `${d}-${m}-${y}`;
                    }
                    
                    // Force text format in Excel using leading apostrophe trick to prevent mangling
                    if (
                        lowerField.includes('phone') || 
                        lowerField.includes('whatsapp') || 
                        lowerField.includes('id') || 
                        lowerField.includes('no') || 
                        isDateLike ||
                        (!isNaN(Number(finalVal)) && finalVal.length >= 8)
                    ) {
                        return formatCell(`'${finalVal}`);
                    }

                    return formatCell(finalVal);
                }
            }
            // Provide generic placeholders if no demo student exists to guide the user
            if (rowIndex === 1 && !demoStudent) {
                const lowerField = rawField.toLowerCase();
                if (lowerField.includes('first')) return formatCell('John');
                if (lowerField.includes('last')) return formatCell('Doe');
                if (lowerField.includes('email')) return formatCell('john.doe@example.com');
                if (lowerField.includes('phone') || lowerField.includes('mobile')) return formatCell("'9876543210");
                if (lowerField.includes('gender')) return formatCell('Male');
                if (lowerField.includes('dob') || lowerField.includes('date')) return formatCell('15-05-2015');
                if (lowerField.includes('address')) return formatCell('123 Green Valley');
                if (lowerField.includes('city')) return formatCell('Springfield');
                if (lowerField.includes('section')) return formatCell('A');
                if (lowerField.includes('roll')) return formatCell('101');
                if (lowerField.includes('type')) return formatCell('new');
            }

            return formatCell('');
        };

        const demoRow1 = config.map(f => getDemoValue(f, 1)).join(',');
        
        const csvContent = headers + '\n' + demoRow1 + '\n';
        setDownloadUrl(csvContent); // Reuse state to store content temporarily or just handle in function
    }, [config, demoStudent]);

    const handleDownloadTemplate = () => {
        if (!config.length) return;
        
        // Helper to format CSV cell securely
        const formatCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
        const headers = config.map(f => formatCell(f.label)).join(',');
        const getDemoValue = (f: any) => {
            const rawField = f.fieldName;
            if (demoStudent) {
                const realValue = demoStudent[rawField];
                if (realValue !== undefined && realValue !== null && realValue !== '') {
                    const strVal = realValue.toString();
                    if (strVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [y, m, d] = strVal.split('-');
                        return formatCell(`${d}-${m}-${y}`);
                    }
                    return formatCell(strVal);
                }
            }
            return formatCell('');
        };
        const demoRow1 = config.map(f => getDemoValue(f)).join(',');
        const csvContent = headers + '\n' + demoRow1 + '\n';
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'student_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

const handleImport = async () => {
    console.log('handleImport called, file:', file);
    if (!file) {
        toast.error('Please select a file first');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            console.log('File loaded, parsing CSV...');
            setImporting(true);

            const text = e.target?.result as string;

            // Robust character-by-character CSV parser that correctly handles:
            // - Commas inside double quotes
            // - Newlines inside double quotes
            // - Escaped double quotes ("")
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
                            i++; // skip next quote
                        } else {
                            insideQuotes = !insideQuotes;
                        }
                    } else if (char === ',' && !insideQuotes) {
                        row.push(currentVal);
                        currentVal = '';
                    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
                        if (char === '\r' && nextChar === '\n') {
                            i++; // skip \n in \r\n
                        }
                        row.push(currentVal);
                        // Check if row has at least one non-empty value
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

            // First row is headers (Labels)
            const headerLabels = parsedRows[0].map(h => h.trim());

            // Create a reverse mapping dictionary: Label -> fieldName
            // Aggressively normalize labels by stripping BOM, non-printable chars, and spaces
            const normalizeLabel = (l: string) => {
                const noBOM = l.replace(/[\uFEFF\u200B-\u200D\u00A0]/g, '').trim();
                return noBOM.replace(/[^a-z0-9]/gi, '').toLowerCase();
            };
            
            const labelToFieldMap: Record<string, string> = {};
            config.forEach(f => {
                labelToFieldMap[normalizeLabel(f.label)] = f.fieldName;
            });

            const studentsData: any[] = [];
            for (let i = 1; i < parsedRows.length; i++) {
                const values = parsedRows[i].map(v => v.trim());
                const studentObj: any = {};
                
                headerLabels.forEach((label, index) => {
                    let value = values[index];
                    if (value !== undefined && value !== '') {
                        // Resolve the system field name using fuzzy keyword matching
                        const cleanLabel = normalizeLabel(label);
                        
                        // Define priority keyword-to-field mapping
                        const keywordMapping: [string, string][] = [
                            ['studentid', 'admissionNumber'],
                            ['admissionnumber', 'admissionNumber'],
                            ['admissionid', 'admissionNumber'],
                            ['admission', 'admissionNumber'],
                            ['registrationno', 'registrationNo'],
                            ['enrollmentno', 'enrollmentNo'],
                            ['apaarid', 'apaarId'],
                            ['penno', 'penNo'],
                            ['srno', 'srNo'],
                            ['classappliedfor', 'classAppliedFor'],
                            ['appliedclass', 'classAppliedFor'],
                            ['enrolledclass', 'className'],
                            ['enrolledsession', 'enrolledSession'],
                            ['stream', 'stream'],
                            ['houseblock', 'house'],
                            ['house', 'house'],
                            ['block', 'house'],
                            ['rte', 'rte'],
                            ['studenttype', 'studentType'],
                            ['studentname', 'name'],
                            ['fullname', 'name'],
                            ['rollnumber', 'rollNumber'],
                            ['rollno', 'rollNumber'],
                            ['rollnumb', 'rollNumber'],
                            ['mobilenumber', 'phone'],
                            ['mobileno', 'phone'],
                            ['mobile', 'phone'],
                            ['whatsapp', 'whatsappNo'],
                            ['email', 'email'],
                            ['class', 'className'],
                            ['section', 'section'],
                            ['fathername', 'fatherName'],
                            ['fatherphone', 'fatherPhone'],
                            ['fatheroccupation', 'fatherOccupation'],
                            ['mothername', 'motherName'],
                            ['motherphone', 'motherPhone'],
                            ['motheroccupation', 'motherOccupation'],
                            ['guardianname', 'guardianName'],
                            ['guardianphone', 'guardianPhone'],
                            ['guardianrelation', 'guardianRelation'],
                            ['guardianoccupation', 'guardianOccupation'],
                            ['guardianaddress', 'guardianAddress'],
                            ['dateofbirth', 'dob'],
                            ['dob', 'dob'],
                            ['gender', 'gender'],
                            ['category', 'category'],
                            ['religion', 'religion'],
                            ['caste', 'caste'],
                            ['nationality', 'nationality'],
                            ['blood', 'bloodGroup'],
                            ['bloodgroup', 'bloodGroup'],
                            ['aadhaarno', 'aadhaarNo'],
                            ['aadhaarcard', 'aadhaarNo'],
                            ['aadhaar', 'aadhaarNo'],
                            ['aadharno', 'aadhaarNo'],
                            ['aadhar', 'aadhaarNo'],
                            ['samagraid', 'samagraId'],
                            ['samagra', 'samagraId'],
                            ['bankaccountno', 'bankAccountNo'],
                            ['bankaccount', 'bankAccountNo'],
                            ['accountno', 'bankAccountNo'],
                            ['ifsccode', 'ifscCode'],
                            ['ifsc', 'ifscCode'],
                            ['bankname', 'bankName'],
                            ['accountholder', 'accountHolderName'],
                            ['tcnumber', 'tcNo'],
                            ['tcno', 'tcNo'],
                            ['tcdate', 'tcDate'],
                            ['previousschoolname', 'previousSchool'],
                            ['previousschool', 'previousSchool'],
                            ['lastschoolname', 'previousSchool'],
                            ['firstlanguage', 'firstLanguage'],
                            ['1stlanguage', 'firstLanguage'],
                            ['secondlanguage', 'secondLanguage'],
                            ['2ndlanguage', 'secondLanguage'],
                            ['thirdlanguage', 'thirdLanguage'],
                            ['3rdlanguage', 'thirdLanguage'],
                            ['religion', 'religion'],
                            ['category', 'category'],
                            ['gender', 'gender'],
                            ['sex', 'gender'],
                            ['height', 'height'],
                            ['weight', 'weight'],
                            ['address', 'currentAddress'],
                            ['currentaddress', 'currentAddress'],
                            ['permanentaddress', 'permanentAddress'],
                            ['village', 'village'],
                            ['locality', 'locality'],
                            ['postoffice', 'postOffice'],
                            ['po', 'postOffice'],
                            ['policestation', 'policeStation'],
                            ['ps', 'policeStation'],
                            ['city', 'city'],
                            ['currentcity', 'city'],
                            ['district', 'district'],
                            ['state', 'state'],
                            ['currentstate', 'state'],
                            ['pincode', 'pincode'],
                            ['pin', 'pincode'],
                            ['country', 'country'],
                            ['currentcountry', 'country'],
                            ['permanentvillage', 'permanentVillage'],
                            ['permanentlocality', 'permanentLocality'],
                            ['permanentpostoffice', 'permanentPostOffice'],
                            ['permanentpo', 'permanentPostOffice'],
                            ['permanentpolicestation', 'permanentPoliceStation'],
                            ['permanentps', 'permanentPoliceStation'],
                            ['permanentdistrict', 'permanentDistrict'],
                            ['permanentcity', 'permanentCity'],
                            ['permanentstate', 'permanentState'],
                            ['permanentpincode', 'permanentPincode'],
                            ['permanentcountry', 'permanentCountry'],
                            ['enrolledyear', 'enrolledYear'],
                            ['yearofenrollment', 'enrolledYear'],
                            ['admissionyear', 'enrolledYear'],
                            ['joiningyear', 'enrolledYear'],
                            ['enrolledsession', 'enrolledSession'],
                            ['academicsession', 'enrolledSession'],
                            ['referredby', 'referredBy'],
                            ['reference', 'referredBy'],
                            ['specialneedsdisability', 'specialNeeds'],
                            ['specialneeds', 'specialNeeds'],
                            ['disability', 'specialNeeds'],
                            ['hasspecialneeds', 'specialNeeds'],
                            ['specialneedsdetails', 'specialNeedsDetails'],
                            ['recorddateheightweight', 'recordDateHeightWeight'],
                            ['recorddate', 'recordDateHeightWeight'],
                            ['measurementdate', 'recordDateHeightWeight'],
                            ['heightweightdate', 'recordDateHeightWeight'],
                            ['dateofmeasurement', 'recordDateHeightWeight'],
                            ['houseblock', 'house'],
                            ['block', 'house'],
                            ['studentphoto', 'photo'],
                            ['photo', 'photo'],
                            ['student_photo', 'photo'],
                            ['fatherphoto', 'fatherPhoto'],
                            ['fathersphoto', 'fatherPhoto'],
                            ['motherphoto', 'motherPhoto'],
                            ['mothersphoto', 'motherPhoto'],
                            ['guardianphoto', 'guardianPhoto'],
                            ['guardianemail', 'guardianEmail'],
                            ['parentemail', 'guardianEmail'],
                            ['fathersemailid', 'fatherEmail'],
                            ['fathersemail', 'fatherEmail'],
                            ['fatheremail', 'fatherEmail'],
                            ['fatheremailid', 'fatherEmail'],
                            ['mothersemailid', 'motherEmail'],
                            ['mothersemail', 'motherEmail'],
                            ['motheremail', 'motherEmail'],
                            ['motheremailid', 'motherEmail'],
                            ['previousschoolslastclass', 'previousLastClass'],
                            ['previouslastclass', 'previousLastClass'],
                            ['lastclass', 'previousLastClass'],
                            ['prevclass', 'previousLastClass'],
                            ['previousclass', 'previousLastClass'],
                            ['affiliatedboard', 'affiliatedBoard'],
                            ['lastschoolboard', 'affiliatedBoard'],
                            ['board', 'affiliatedBoard'],
                            ['marksobtained', 'marksObtained'],
                            ['totalmarks', 'marksObtained'],
                            ['marks', 'marksObtained'],
                            ['percentagecgpa', 'percentageCGPA'],
                            ['percentage', 'percentageCGPA'],
                            ['cgpa', 'percentageCGPA'],
                            ['result', 'result'],
                            ['passorfail', 'result'],
                        ];

                        // 1. Try exact match from school config labels first
                        let resolvedField = labelToFieldMap[cleanLabel];

                        // 2. Try fuzzy keyword matching if no exact match found
                        if (!resolvedField) {
                            for (const [keyword, field] of keywordMapping) {
                                if (cleanLabel.includes(keyword)) {
                                    resolvedField = field;
                                    break;
                                }
                            }
                        }

                        // 3. Fallback to the original label if still unmapped
                        if (!resolvedField) {
                            resolvedField = label;
                        }

                        // Strip leading apostrophe injected by our generator or users for Excel cell formatting
                        if (value.startsWith("'") || value.startsWith("`")) {
                            value = value.substring(1);
                        }
                        
                        // Strip ="" wrapper if users try formula tricks
                        if (value.startsWith('="') && value.endsWith('"')) {
                            value = value.substring(2, value.length - 1);
                        }

                        // Handle scientific notation (e.g. 8.44E+09 for phone numbers)
                        if (value.includes('E+') || value.includes('e+')) {
                            const num = Number(value);
                            if (!isNaN(num)) {
                                value = num.toLocaleString('fullwide', { useGrouping: false });
                            }
                        }
                        
                        // Robust Date Handling
                        const normalizedDate = value.replace(/[\/\s]/g, '-');
                        const dateMatch = normalizedDate.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                        if (dateMatch) {
                            const d = dateMatch[1].padStart(2, '0');
                            const m = dateMatch[2].padStart(2, '0');
                            const y = dateMatch[3];
                            value = `${y}-${m}-${d}`;
                        } else {
                            const shortDateMatch = normalizedDate.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
                            if (shortDateMatch) {
                                const d = shortDateMatch[1].padStart(2, '0');
                                const m = shortDateMatch[2].padStart(2, '0');
                                const yearSuffix = shortDateMatch[3];
                                const year = parseInt(yearSuffix) > 50 ? `19${yearSuffix}` : `20${yearSuffix}`;
                                value = `${year}-${m}-${d}`;
                            }
                        }
                        // Smart splitting for "Class Name(Section)" format
                        if (resolvedField === 'className' && value.includes('(') && value.endsWith(')')) {
                            const parts = value.split('(');
                            const extractedClass = parts[0].trim();
                            const extractedSection = parts[1].replace(')', '').trim();
                            
                            studentObj['className'] = extractedClass;
                            if (!studentObj['section']) {
                                studentObj['section'] = extractedSection;
                            }
                        } else {
                            studentObj[resolvedField] = value;
                        }
                    }
                });

                // Basic validation
                if (studentObj.firstName || studentObj.lastName || studentObj.name) {
                    studentsData.push(studentObj);
                }
            }

            if (studentsData.length === 0) {
                throw new Error('No valid student data found in the file. Check if headers match your labels.');
            }

            const res = await importStudentsBatch(schoolId, studentsData);

            if (res.success && res.results) {
                const added = res.results.added ?? 0;
                const updated = res.results.updated ?? 0;
                const errors = res.results.errors ?? 0;
                const total = res.results.total ?? studentsData.length;

                const parts = [];
                if (added > 0) parts.push(`${added} new student(s) added`);
                if (updated > 0) parts.push(`${updated} existing student(s) updated`);

                if (parts.length > 0) {
                    toast.success(`✅ Import Complete! ${parts.join(', ')} (${total} total records processed).`, { duration: 7000 });
                } else if (errors === 0) {
                    toast.warning(`⚠️ Nothing to import — all ${total} record(s) were already up to date.`, { duration: 6000 });
                }

                if (errors > 0) {
                    toast.error(`❌ Failed to import ${errors} record(s) due to formatting or validation issues.`, { duration: 8000 });
                }
                onSuccess();
                onClose();
            } else {
                throw new Error(res.error || 'Failed to import students');
            }

        } catch (err: any) {
            toast.error(err.message || 'Error parsing or importing CSV');
        } finally {
            setImporting(false);
        }
    };
    
    reader.readAsText(file);
};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-indigo-600" />
                        Import Students
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5 text-slate-500" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                            <p className="text-sm font-medium">Loading admission template...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col items-start gap-4">
                                <div>
                                    <h3 className="font-bold text-indigo-900 text-sm">Step 1: Download Template</h3>
                                    <p className="text-xs text-indigo-700 mt-1">
                                        Download the CSV template. The columns match your current admission form configuration.
                                    </p>
                                </div>
                                <Button 
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full font-bold"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download CSV Template
                                </Button>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        Step 2: Upload Data
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 mb-3">
                                        Fill in the downloaded template and upload it back here.
                                    </p>
                                    
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
                                            {file ? (
                                                <p className="text-sm text-indigo-600 font-medium truncate max-w-[200px]">{file.name}</p>
                                            ) : (
                                                <p className="text-sm text-slate-500"><span className="font-bold">Click to upload</span> or drag and drop</p>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={importing}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleImport} 
                        disabled={loading || !file || importing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {importing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
                            </>
                        ) : (
                            'Import Data'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
