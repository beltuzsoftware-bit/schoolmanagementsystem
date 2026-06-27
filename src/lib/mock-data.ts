import { User, School, SaasPackage, Module, IDCardTemplate, StaffFormTemplate, AdmissionFormTemplate, StudentProfileTemplate, AccessoryTemplate } from '@/types';

export const MODULES: Module[] = [
    { id: 'm1', name: 'Student Management', description: 'Comprehensive student lifecycle from admission to graduation', icon: 'Users' },
    { id: 'm2', name: 'Student Information', description: 'Student profiles, academic records, and parent information', icon: 'Users' },
    { id: 'm3', name: 'Fees Collection', description: 'Fee structure and collection', icon: 'Banknote' },
    { id: 'm4', name: 'Attendance', description: 'Student and staff attendance', icon: 'CalendarCheck' },
    { id: 'm5', name: 'Academics', description: 'Classes, subjects, and timetable', icon: 'BookOpen' },
    { id: 'm6', name: 'Human Resource', description: 'Staff management', icon: 'Briefcase' },
    { id: 'm7', name: 'Payroll', description: 'Salary and payroll management', icon: 'Wallet' },
    { id: 'm8', name: 'ID Cards', description: 'Generate student ID cards', icon: 'IdCard' },
    { id: 'm9', name: 'QR Fee Collection', description: 'Generate UPI QR codes for fees', icon: 'QrCode' },
    { id: 'm10', name: 'Accessories Management', description: 'Manage school accessories like uniforms, books, and stationery', icon: 'ShoppingBag' },
    { id: 'm11', name: 'Reports', description: 'Comprehensive reporting dashboard for student, staff, fee, and attendance data', icon: 'FileText' },
    { id: 'm12', name: 'Transport Management', description: 'Manage routes, vehicles, vehicle types, drivers, and allocations', icon: 'Bus' },
];

export const PACKAGES: SaasPackage[] = [
    {
        id: 'p1',
        name: 'Basic',
        price: 15000,
        color: 'bg-blue-500',
        description: 'Entry level package for small schools',
        maxStudents: 500,
        duration: 1,
        modules: ['m1', 'm4'],
        staffFormTemplateId: 'tmpl_staff_standard',
        admissionFormTemplateId: 'tmpl_adm_standard',
        qrTransactionLimit: 100,
        transactionRate: 5
    },
    {
        id: 'p2',
        name: 'Standard',
        price: 35000,
        color: 'bg-indigo-500',
        description: 'Most popular for mid-sized schools',
        maxStudents: 2000,
        duration: 1,
        modules: ['m1', 'm2', 'm3', 'm4', 'm5', 'm9', 'm10', 'm11'],
        staffFormTemplateId: 'tmpl_staff_standard',
        admissionFormTemplateId: 'tmpl_adm_standard',
        qrTransactionLimit: 500,
        transactionRate: 0
    },
    {
        id: 'p3',
        name: 'Premium',
        price: 50000,
        color: 'bg-purple-500',
        description: 'Complete solution for large institutions',
        maxStudents: 5000,
        duration: 1,
        modules: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'],
        staffFormTemplateId: 'tmpl_staff_standard',
        admissionFormTemplateId: 'tmpl_adm_standard',
        qrTransactionLimit: -1,
        transactionRate: 0
    },
];

export const MOCK_USERS: User[] = [
    {
        id: 'u_super',
        name: 'Super Admin',
        email: 'superadmin',
        password: '6543210',
        role: 'SUPER_ADMIN',
        avatar: 'https://github.com/shadcn.png'
    },
    {
        id: 'u_root',
        name: 'Saraswati',
        email: 'Saraswati',
        password: 'Chakroborty@8001402378',
        role: 'ROOT',
        avatar: '/saraswati.png'
    },
    {
        id: 'u_school_admin_demo',
        name: 'Demo Principal',
        email: 'admin',
        password: '123456',
        role: 'SCHOOL_ADMIN',
        schoolId: 's1',
        avatar: 'https://github.com/shadcn.png'
    }
];

export const MOCK_SCHOOLS: School[] = [
    {
        id: 's1',
        name: 'The Millennium International School',
        schoolId: 'MIS001',
        code: 'MIS001',
        address: 'Mumbai, Maharashtra',
        contactNumber: '9123456789',
        email: 'info@mis.edu',
        logo: '/logo_placeholder.png',
        packageId: 'p3',
        studentCount: 1250,
        isActive: true,
        admins: ['u_school_admin_demo']
    }
];

export const DEFAULT_ID_CARD_TEMPLATES: IDCardTemplate[] = [
    {
        id: 'tmpl_classic_blue',
        name: 'Classic Blue',
        layout: 'vertical',
        width: 54, // Standard Credit Card size
        height: 86,
        primaryColor: '#2563eb', // Blue-600
        secondaryColor: '#ffffff',
        fontFamily: 'Alice',
        showPhoto: true,
        showLogo: true,
        signatureText: 'Principal Signature',
        fields: [
            { id: 'f1', label: 'Name', key: 'name', bold: true },
            { id: 'f2', label: 'Class', key: 'className', bold: false },
            { id: 'f3', label: 'Roll No', key: 'rollNumber', bold: false },
            { id: 'f4', label: 'DOB', key: 'dob', bold: false },
            { id: 'f5', label: 'Blood Group', key: 'bloodGroup', bold: true },
        ]
    },
    {
        id: 'tmpl_gold_premium',
        name: 'Gold Premium',
        layout: 'horizontal',
        width: 86,
        height: 54,
        primaryColor: '#d97706', // Amber-600
        secondaryColor: '#fffbeb', // Amber-50
        fontFamily: 'Cinzel',
        backgroundImage: '/patterns/gold-overlay.png',
        showPhoto: true,
        showLogo: true,
        signatureText: 'Authorized Signatory',
        fields: [
            { id: 'f1', label: 'Student Name', key: 'name', bold: true },
            { id: 'f2', label: 'ID Number', key: 'admissionNumber', bold: true },
            { id: 'f3', label: 'Grade', key: 'className', bold: false },
            { id: 'f4', label: 'Emergency', key: 'emergencyContact', bold: false },
        ]
    },
    {
        id: 'tmpl_modern_minimal',
        name: 'Modern Minimal',
        layout: 'vertical',
        width: 54,
        height: 86,
        primaryColor: '#1e293b', // Slate-800
        secondaryColor: '#f8fafc', // Slate-50
        fontFamily: 'Inter',
        showPhoto: true,
        showLogo: true,
        signatureText: 'Principal',
        fields: [
            { id: 'f1', label: '', key: 'name', bold: true }, // Name only
            { id: 'f2', label: 'Born', key: 'dob', bold: false },
            { id: 'f3', label: 'Class', key: 'className', bold: false },
        ]
    },
    {
        id: 'tmpl_faculty_special',
        name: 'Faculty Special',
        layout: 'vertical',
        width: 54,
        height: 86,
        primaryColor: '#0f172a', // Slate-900 (Professional/Serious)
        secondaryColor: '#ffffff',
        fontFamily: 'Alice',
        showPhoto: true,
        showLogo: true,
        signatureText: 'Principal / Dean',
        fields: [
            { id: 'f1', label: 'Employee Name', key: 'name', bold: true },
            { id: 'f2', label: 'Designation', key: 'designation', bold: false },
            { id: 'f3', label: 'Department', key: 'department', bold: false },
            { id: 'f4', label: 'Emp ID', key: 'employeeId', bold: true },
        ]
    }
];

export const DEFAULT_STAFF_FORM_TEMPLATES: StaffFormTemplate[] = [
    {
        id: 'tmpl_staff_standard',
        name: 'Standard Employee Form',
        description: 'Default comprehensive registration form for all staff members.',
        isDefault: true,
        config: [
            { id: 'husbandName', section: 'Personal', label: 'Husband Name', fieldName: 'husbandName', visible: true, required: false },
            { id: 'fatherName', section: 'Personal', label: 'Father Name', fieldName: 'fatherName', visible: true, required: false },
            { id: 'religion', section: 'Personal', label: 'Religion', fieldName: 'religion', visible: true, required: false },
            { id: 'category', section: 'Personal', label: 'Category', fieldName: 'category', visible: true, required: false },
            { id: 'maritalStatus', section: 'Personal', label: 'Marital Status', fieldName: 'maritalStatus', visible: true, required: false },
            { id: 'currentAddress', section: 'Address', label: 'Current Address', fieldName: 'currentAddress', visible: true, required: false },
            { id: 'permanentAddress', section: 'Address', label: 'Permanent Address', fieldName: 'permanentAddress', visible: true, required: false },
            { id: 'city', section: 'Address', label: 'City', fieldName: 'city', visible: true, required: false },
            { id: 'state', section: 'Address', label: 'State', fieldName: 'state', visible: true, required: false },
            { id: 'pincode', section: 'Address', label: 'Pincode', fieldName: 'pincode', visible: true, required: false },
            { id: 'country', section: 'Address', label: 'Country', fieldName: 'country', visible: true, required: false },
            { id: 'bankDetails', section: 'Bank', label: 'Enable Bank Details Section', fieldName: 'bankDetails', visible: true, required: false },
            { id: 'panNo', section: 'Bank', label: 'PAN Number', fieldName: 'panNo', visible: true, required: false },
            { id: 'pfAccNo', section: 'Bank', label: 'PF Account Number', fieldName: 'pfAccNo', visible: true, required: false },
            { id: 'uanNo', section: 'Bank', label: 'UAN Number', fieldName: 'uanNo', visible: true, required: false },
            { id: 'experience', section: 'Experience', label: 'Enable Experience Section', fieldName: 'experience', visible: true, required: false },
        ]
    }
];

export const DEFAULT_ADMISSION_FORM_TEMPLATES: AdmissionFormTemplate[] = [
    {
        id: 'tmpl_adm_standard',
        name: 'Standard Admission Form',
        description: 'Default student registration form covering basic, contact, and academic details.',
        isDefault: true,
        config: [
            // Admission Details
            { fieldName: 'registrationNo', label: 'Registration Number', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 0 },
            { fieldName: 'enrollmentNo', label: 'Enrollment Number', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 1 },
            { fieldName: 'apaarId', label: 'APAAR ID', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 2 },
            { fieldName: 'penNo', label: 'PEN No.', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 3 },
            { fieldName: 'srNo', label: 'SR No.', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 4 },
            { fieldName: 'generalRegistrationNo', label: 'General Registration No.', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 5 },
            { fieldName: 'admissionDate', label: 'Admission Date', visible: true, required: true, sectionName: 'Admission Details', orderIndex: 6 },
            { fieldName: 'stream', label: 'Stream', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 7 },
            { fieldName: 'classAppliedFor', label: 'Class (Applied For)', visible: true, required: true, sectionName: 'Admission Details', orderIndex: 8 },
            { fieldName: 'enrolledYear', label: 'Enrolled Year', visible: true, required: true, sectionName: 'Admission Details', orderIndex: 9 },
            { fieldName: 'enrolledSession', label: 'Enrolled Session', visible: true, required: true, sectionName: 'Admission Details', orderIndex: 10 },
            { fieldName: 'className', label: 'Enrolled Class', visible: true, required: true, sectionName: 'Admission Details', orderIndex: 11 },
            { fieldName: 'section', label: 'Enrolled Section', visible: true, required: true, sectionName: 'Admission Details', orderIndex: 12 },
            { fieldName: 'rollNumber', label: 'Roll Number', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 13 },
            { fieldName: 'houseBlock', label: 'House / Block', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 14 },
            { fieldName: 'referredBy', label: 'Referred By', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 15 },
            { fieldName: 'firstLanguage', label: '1st Language', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 16 },
            { fieldName: 'secondLanguage', label: '2nd Language', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 17 },
            { fieldName: 'thirdLanguage', label: '3rd Language', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 18 },
            { fieldName: 'studentType', label: 'Student Type (Manual Override)', visible: true, required: false, sectionName: 'Admission Details', orderIndex: 19 },
            // Personal Information
            { fieldName: 'photo', label: 'Student Photo', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 0 },
            { fieldName: 'rte', label: 'Is RTE Student?', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 1 },
            { fieldName: 'firstName', label: 'First Name', visible: true, required: true, sectionName: 'Student Personal Attributes', orderIndex: 2 },
            { fieldName: 'lastName', label: 'Last Name', visible: true, required: true, sectionName: 'Student Personal Attributes', orderIndex: 3 },
            { fieldName: 'dob', label: 'Date of Birth', visible: true, required: true, sectionName: 'Student Personal Attributes', orderIndex: 4 },
            { fieldName: 'gender', label: 'Gender', visible: true, required: true, sectionName: 'Student Personal Attributes', orderIndex: 5 },
            { fieldName: 'bloodGroup', label: 'Blood Group', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 6 },
            { fieldName: 'phone', label: 'Mobile Number', visible: true, required: true, sectionName: 'Student Personal Attributes', orderIndex: 7 },
            { fieldName: 'email', label: 'Email ID', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 8 },
            { fieldName: 'whatsappNo', label: 'WhatsApp Number', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 9 },
            { fieldName: 'alternateNumber', label: 'Alternate Number', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 10 },
            { fieldName: 'height', label: 'Height (cm)', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 11 },
            { fieldName: 'weight', label: 'Weight (kg)', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 12 },
            { fieldName: 'measurementDate', label: 'Record Date (Height/Weight)', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 13 },
            { fieldName: 'hasSpecialNeeds', label: 'Special Needs / Disability', visible: true, required: false, sectionName: 'Student Personal Attributes', orderIndex: 14 },
            { fieldName: 'specialNeedsDetails', label: 'Special Needs Details', visible: false, required: false, sectionName: 'Student Personal Attributes', orderIndex: 15 },
            // Parents / Guardian
            { fieldName: 'fatherName', label: "Father's Name", visible: true, required: true, sectionName: 'Family & Guardian', orderIndex: 0 },
            { fieldName: 'fatherOccupation', label: "Father's Occupation", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 1 },
            { fieldName: 'fatherPhone', label: "Father's Mobile No.", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 2 },
            { fieldName: 'fatherPhoto', label: "Father's Photo", visible: false, required: false, sectionName: 'Family & Guardian', orderIndex: 3 },
            { fieldName: 'motherName', label: "Mother's Name", visible: true, required: true, sectionName: 'Family & Guardian', orderIndex: 4 },
            { fieldName: 'motherOccupation', label: "Mother's Occupation", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 5 },
            { fieldName: 'motherPhone', label: "Mother's Mobile No.", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 6 },
            { fieldName: 'motherPhoto', label: "Mother's Photo", visible: false, required: false, sectionName: 'Family & Guardian', orderIndex: 7 },
            { fieldName: 'motherDocName', label: "Mother's Document Name", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 8 },
            { fieldName: 'motherDocFile', label: "Mother's Document File", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 9 },
            { fieldName: 'fatherDocName', label: "Father's Document Name", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 10 },
            { fieldName: 'fatherDocFile', label: "Father's Document File", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 11 },
            { fieldName: 'guardianDocName', label: "Guardian Document Name", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 12 },
            { fieldName: 'guardianDocFile', label: "Guardian Document File", visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 13 },
            { fieldName: 'guardianSelection', label: 'Guardian Selection', visible: true, required: true, sectionName: 'Family & Guardian', orderIndex: 14 },
            { fieldName: 'guardianName', label: 'Guardian Name', visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 15 },
            { fieldName: 'guardianRelation', label: 'Guardian Relation', visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 16 },
            { fieldName: 'guardianOccupation', label: 'Guardian Occupation', visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 17 },
            { fieldName: 'guardianPhone', label: 'Guardian Mobile No.', visible: true, required: false, sectionName: 'Family & Guardian', orderIndex: 18 },
            { fieldName: 'guardianPhoto', label: 'Guardian Photo', visible: false, required: false, sectionName: 'Family & Guardian', orderIndex: 19 },
            // Address Details
            { fieldName: 'currentAddress', label: 'Current Address', visible: true, required: true, sectionName: 'Contact & Address', orderIndex: 0 },
            { fieldName: 'village', label: 'Village', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 1 },
            { fieldName: 'locality', label: 'Locality', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 2 },
            { fieldName: 'po', label: 'P.O (Post Office)', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 3 },
            { fieldName: 'ps', label: 'P.S (Police Station)', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 4 },
            { fieldName: 'city', label: 'City', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 5 },
            { fieldName: 'district', label: 'District', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 6 },
            { fieldName: 'state', label: 'State', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 7 },
            { fieldName: 'pincode', label: 'Pincode', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 8 },
            { fieldName: 'country', label: 'Country', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 9 },
            { fieldName: 'permanentAddress', label: 'Permanent Address', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 10 },
            { fieldName: 'permanentVillage', label: 'Permanent Village', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 11 },
            { fieldName: 'permanentLocality', label: 'Permanent Locality', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 12 },
            { fieldName: 'permanentPo', label: 'Permanent P.O', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 13 },
            { fieldName: 'permanentPs', label: 'Permanent P.S', visible: true, required: false, sectionName: 'Contact & Address', orderIndex: 14 },
            { fieldName: 'permanentCity', label: 'Permanent City', visible: false, required: false, sectionName: 'Contact & Address', orderIndex: 15 },
            { fieldName: 'permanentDistrict', label: 'Permanent District', visible: false, required: false, sectionName: 'Contact & Address', orderIndex: 16 },
            { fieldName: 'permanentState', label: 'Permanent State', visible: false, required: false, sectionName: 'Contact & Address', orderIndex: 17 },
            { fieldName: 'permanentPincode', label: 'Permanent Pincode', visible: false, required: false, sectionName: 'Contact & Address', orderIndex: 18 },
            { fieldName: 'permanentCountry', label: 'Permanent Country', visible: false, required: false, sectionName: 'Contact & Address', orderIndex: 19 },
            // Previous Academic Details
            { fieldName: 'previousSchool', label: 'Last School Name', visible: true, required: false, sectionName: 'Previous Academic Details', orderIndex: 0 },
            { fieldName: 'lastSchoolAffiliatedTo', label: 'Affiliated Board', visible: true, required: false, sectionName: 'Previous Academic Details', orderIndex: 1 },
            { fieldName: 'tcNo', label: 'TC Number', visible: true, required: false, sectionName: 'Previous Academic Details', orderIndex: 2 },
            { fieldName: 'tcDate', label: 'TC Date', visible: true, required: false, sectionName: 'Previous Academic Details', orderIndex: 3 },
            { fieldName: 'qualification', label: 'Result', visible: true, required: false, sectionName: 'Previous Academic Details', orderIndex: 4 },
            { fieldName: 'obtMarks', label: 'Marks Obtained', visible: true, required: false, sectionName: 'Previous Academic Details', orderIndex: 5 },
            { fieldName: 'percentage', label: 'Percentage / CGPA', visible: true, required: false, sectionName: 'Previous Academic Details', orderIndex: 6 },
            { fieldName: 'tcFile', label: 'TC File', visible: false, required: false, sectionName: 'Previous Academic Details', orderIndex: 7 },
            // Bank & Govt IDs
            { fieldName: 'aadhaarNo', label: 'Aadhar Number', visible: true, required: false, sectionName: 'Govt. IDs & Bank Details', orderIndex: 0 },
            { fieldName: 'samagraId', label: 'Samagra ID', visible: true, required: false, sectionName: 'Govt. IDs & Bank Details', orderIndex: 1 },
            { fieldName: 'bankAccountNo', label: 'Bank Account No.', visible: false, required: false, sectionName: 'Govt. IDs & Bank Details', orderIndex: 2 },
            { fieldName: 'ifscCode', label: 'IFSC Code', visible: false, required: false, sectionName: 'Govt. IDs & Bank Details', orderIndex: 3 },
            { fieldName: 'bankName', label: 'Bank Name', visible: false, required: false, sectionName: 'Govt. IDs & Bank Details', orderIndex: 4 },
            { fieldName: 'accountHolderName', label: 'Account Holder', visible: false, required: false, sectionName: 'Govt. IDs & Bank Details', orderIndex: 5 },
            // Miscellaneous
            { fieldName: 'religion', label: 'Religion', visible: true, required: false, sectionName: 'Miscellaneous', orderIndex: 0 },
            { fieldName: 'category', label: 'Category', visible: true, required: false, sectionName: 'Miscellaneous', orderIndex: 1 },
            { fieldName: 'caste', label: 'Caste', visible: false, required: false, sectionName: 'Miscellaneous', orderIndex: 2 },
            { fieldName: 'nationality', label: 'Nationality', visible: true, required: false, sectionName: 'Miscellaneous', orderIndex: 3 },
            { fieldName: 'miscDocuments', label: 'Upload Documents List', visible: true, required: false, sectionName: 'Miscellaneous Documents', orderIndex: 4 },
        ]
    }
];

export const DEFAULT_SUBJECT_GROUPS: import('@/types').SubjectGroup[] = [
    { id: 'sg1', name: 'Languages', description: 'English, Hindi, Sanskrit, etc.', category: 'Core Subject' },
    { id: 'sg2', name: 'Sciences', description: 'Physics, Chemistry, Biology', category: 'Core Subject' },
    { id: 'sg3', name: 'Mathematics', description: 'Algebra, Geometry, Calculus', category: 'Core Subject' },
    { id: 'sg4', name: 'Social Studies', description: 'History, Geography, Civics', category: 'Core Subject' },
];

export const DEFAULT_SUBJECTS: import('@/types').Subject[] = [
    { id: 'sub1', name: 'English', code: 'ENG', type: 'Theory', category: 'Core Subject', subjectGroupId: 'sg1' },
    { id: 'sub2', name: 'Mathematics', code: 'MATH', type: 'Theory', category: 'Core Subject', subjectGroupId: 'sg3' },
    { id: 'sub3', name: 'Physics', code: 'PHY', type: 'Theory', category: 'Elective', subjectGroupId: 'sg2' },
    { id: 'sub4', name: 'Chemistry', code: 'CHEM', type: 'Theory', category: 'Elective', subjectGroupId: 'sg2' },
    { id: 'sub5', name: 'Computer Science', code: 'CS', type: 'Practical', category: 'Optional', subjectGroupId: 'sg2' },
];

export const DEFAULT_STUDENT_PROFILE_TEMPLATES: StudentProfileTemplate[] = [
    {
        id: 'tmpl_std_dossier_standard',
        name: 'Standard Student Dossier',
        description: 'Premium student identity dossier with tabs and advanced tracking.',
        isDefault: true,
        config: [
            { fieldName: 'personalDetails', label: 'Personal Details Section', visible: true, required: true },
            { fieldName: 'academicHistory', label: 'Academic History', visible: true, required: false },
            { fieldName: 'parentGuardian', label: 'Parent & Guardian Info', visible: true, required: true },
            { fieldName: 'attendanceStats', label: 'Attendance Statistics', visible: true, required: false },
            { fieldName: 'feeSummary', label: 'Fee Payment Summary', visible: true, required: false },
            { fieldName: 'documents', label: 'Uploaded Documents', visible: true, required: false },
            { fieldName: 'healthFitness', label: 'Health & Fitness', visible: false, required: false },
        ]
    }
];

export const DEFAULT_ACCESSORY_TEMPLATES: AccessoryTemplate[] = [
    {
        id: 'tmpl_acc_standard',
        name: 'Standard Comprehensive Template',
        description: 'Default setup for accessories including Uniforms, Books, and Stationery.',
        isDefault: true,
        categories: [
            { id: 'cat_uniform', name: 'Uniforms', description: 'School shirts, trousers, and skirts', icon: 'Shirt' },
            { id: 'cat_books', name: 'Books', description: 'Textbooks and notebooks', icon: 'Book' },
            { id: 'cat_stationery', name: 'Stationery', description: 'Pens, pencils, and art supplies', icon: 'PenTool' },
            { id: 'cat_misc', name: 'Miscellaneous', description: 'ID card holders, ties, and belts', icon: 'Tag' }
        ],
        defaultItems: [
            { id: 'acc_white_shirt', categoryId: 'cat_uniform', name: 'White Shirt (Standard)', sku: 'UNI-WHT-SHT' },
            { id: 'acc_blue_trousers', categoryId: 'cat_uniform', name: 'Navy Blue Trousers', sku: 'UNI-BLU-TRS' },
            { id: 'acc_notebook_100', categoryId: 'cat_books', name: '100 Pages Notebook', sku: 'BOK-NBK-100' },
            { id: 'acc_pencil_hb', categoryId: 'cat_stationery', name: 'HB Pencil Pack', sku: 'STA-PEN-HB' }
        ],
        fieldConfig: [
            { fieldName: 'hsnCode', label: 'HSN Code', isVisible: true, isRequired: false },
            { fieldName: 'description', label: 'Short Description', isVisible: true, isRequired: false },
            { fieldName: 'vendorDetails', label: 'Vendor Details', isVisible: true, isRequired: false },
            { fieldName: 'entryDate', label: 'Entry Date', isVisible: true, isRequired: false },
            { fieldName: 'entryQuantity', label: 'Entry Quantity', isVisible: true, isRequired: false },
            { fieldName: 'totalQuantity', label: 'Total Quantity', isVisible: true, isRequired: false },
            { fieldName: 'availableQuantity', label: 'Total Available Qty', isVisible: true, isRequired: true },
            { fieldName: 'thresholdQuantity', label: 'Qty Threshold', isVisible: true, isRequired: false },
            { fieldName: 'buyPrice', label: 'Buy Rate', isVisible: true, isRequired: false },
            { fieldName: 'sellPrice', label: 'Sell Rate', isVisible: true, isRequired: true },
            { fieldName: 'carryForward', label: 'Carry Forward to Next Session', isVisible: true, isRequired: false },
        ]
    }
];
