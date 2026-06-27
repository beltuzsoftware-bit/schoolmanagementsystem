import { StudentSettings } from './student-settings';
import { FeeDiscount, FeeReminder } from './fees';

export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ROOT' | 'STAFF' | 'STUDENT' | 'PARENT';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // In real app, never store plain text. For mock, we check against this.
    role: UserRole;
    schoolId?: string;
    avatar?: string;
    designation?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Session {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean; // Used for current academic session logic
    isActive: boolean; // Used for settings management
    status: 'Planned' | 'Active' | 'Completed';
}

export interface School extends Partial<StudentSettings> {
    id: string;
    name: string;
    schoolId: string; // Unique ID assigned by Super Admin
    code: string; // Government/Official Code
    address: string;
    contactNumber: string;
    email: string;
    logo: string;
    packageId: string;
    studentCount: number;
    isActive: boolean;
    admins: string[]; // User IDs
    // Extended Profile Fields
    tagline?: string;
    shortName?: string;
    affiliation?: string;
    affiliationCode?: string;
    currentSession?: string;
    udise?: string;
    contactPerson?: string;
    landline?: string;
    whatsapp?: string;
    website?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    currency?: string;
    language?: string;
    weekOff?: string;
    gstNo?: string;
    about?: string;
    watermark?: string;
    signature?: string;
    qrCode?: string;
    upiId?: string; // UPI ID for receiving fees
    defaultPaymentMode?: string; // Determines default payment mode across the system
    establishedYear?: string;
    admissionNote?: string;
    admissionFormTemplateId?: string;
    admissionFieldOverrides?: Record<string, { label?: string; visible?: boolean; required?: boolean; orderIndex?: number }>;
    studentProfileTemplateId?: string;
    onlineAdmissionOpen?: boolean;
    admissionPaymentEnabled?: boolean;
    admissionFeeAmount?: number;
    requireAdmissionDocs?: boolean;
    accessoryTemplateId?: string;
    accessories?: {
        categories: AccessoryCategory[];
        items: AccessoryItem[];
        fieldConfig: AccessoryFieldConfig[];
    };
    // sessionStartMonth is in StudentSettings partial
    // sessions is in StudentSettings partial (and here locally if needed to override)
    sessions?: Session[];
    feeCollectionTemplate?: string;

    payrollConfig?: {
        mode: 'CALENDAR_DAYS' | 'FIXED_DAYS' | 'CALENDAR_INCLUDE_ALL_DAYS' | 'CALENDAR_EXCLUDE_SUNDAY';
        fixedValue: number;
        defaultPaymentMode?: string;
        paymentModes?: string[];
    };
    languages?: string[];
    categories?: string[];
    feeTypes?: string[];
    feeDiscounts?: FeeDiscount[];
    feeReminders?: FeeReminder[];
}

export interface Module {
    id: string;
    name: string;
    description: string;
    icon: string;
}

export interface SaasPackage {
    id: string;
    name: string;
    price: number;
    color: string;
    description: string;
    maxStudents: number;
    duration: number; // Duration in months
    modules: string[]; // Module IDs
    admissionFormTemplateId?: string;
    staffFormTemplateId?: string;
    studentProfileTemplateId?: string;
    qrTransactionLimit?: number; // -1 for unlimited
    transactionRate?: number; // flat fee per transaction
    accessoryTemplateId?: string;
}

export interface QRTransaction {
    id: string;
    schoolId: string;
    studentId: string;
    studentName: string;
    className?: string;
    amount: number;
    baseAmount?: number;
    month: string;
    monthIndex?: number;
    status: 'Pending' | 'Paid' | 'Cancelled';
    transactionId?: string; // UTR or official Ref ID
    paymentReference?: string; // Link to Invoice/Fee Receipt
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}

export interface StaffFormConfig {
    id: string;
    section: 'Personal' | 'Address' | 'Bank' | 'Experience' | 'Documents' | 'Employment' | 'Salary' | 'Login';
    label: string;
    fieldName: string; // matches the key in formData
    visible: boolean; // default true
    required: boolean; // default false
    systemRequired?: boolean; // if true, cannot be disabled (e.g. Name, Phone)
    // Advanced Logic
    fieldType?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'toggle';
    options?: string[];
    placeholder?: string;
    helpText?: string;
    dependsOn?: {
        fieldName: string;
        value: any;
    };
    hasAutoManualToggle?: boolean;
}

export interface StudentFormConfig {
    fieldName: string;
    label: string;
    visible: boolean;
    required: boolean;
    sectionName?: string;
    orderIndex?: number;
    hasAutoManualToggle?: boolean; // New: For fields like Admission No.
    // Advanced SaaS Logic
    fieldType?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'photo' | 'file';
    options?: string[]; // For select/checkbox
    placeholder?: string;
    helpText?: string;
    dependsOn?: {
        fieldName: string;
        value: any;
    }; // Conditional visibility
}

export interface StaffFormTemplate {
    id: string;
    name: string;
    description: string;
    icon?: string; // New: Custom icon name from Lucide
    config: StaffFormConfig[];
    sectionSettings?: SectionConfig[];
    isDefault?: boolean;
}

export interface StaffRole {
    id: string;
    schoolId: string;
    name: string;
    permissions: string[];
}

// --- ID CARD MODULE ---

export type IDCardElementShape = 'circle' | 'oval' | 'square' | 'rectangle';

export interface IDCardCanvasElement {
    id: string;
    type: 'photo' | 'text' | 'field' | 'signature' | 'labelfield' | 'qrcode';
    x: number;        // % of card width
    y: number;        // % of card height
    width: number;    // % of card width
    height: number;   // % of card height
    rotation: number; // degrees
    opacity: number;  // 0-1
    zIndex: number;
    locked?: boolean;
    // Photo
    shape?: IDCardElementShape;
    borderColor?: string;
    borderWidth?: number;
    // Text / Field / Signature / LabelField
    text?: string;
    fieldKey?: string;
    fieldLabel?: string;      // Display label text (e.g., "Name :")
    labelText?: string;       // Override label prefix for labelfield type
    showLabel?: boolean;      // For labelfield: show/hide the label prefix
    labelWidth?: number;      // % of element width used by label (default 35)
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    underline?: boolean;
    color?: string;
    labelColor?: string;      // Separate color for label part
    align?: 'left' | 'center' | 'right';
    labelAlign?: 'left' | 'center' | 'right';
    valueAlign?: 'left' | 'center' | 'right';
    bgColor?: string;
    fieldBgColor?: string;    // Background for value box only (labelfield type)
    borderRadius?: number;
}

export interface IDCardTemplate {
    id: string;
    name: string;
    layout: 'horizontal' | 'vertical';
    width: number; // in mm
    height: number; // in mm
    schoolId?: string;
    isGlobal?: boolean;
    clonedFromId?: string;
    isDefault?: boolean;

    // Styles
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    backgroundImage?: string; // URL
    layoutMode?: 'grid' | 'drag-drop';
    textColor?: string;
    headerTextColor?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    borderColor?: string;
    borderWidth?: number;
    photoPosition?: {
        x: number; y: number;
        width?: number; height?: number;
        shape?: IDCardElementShape; // circle | oval | square | rectangle
        borderColor?: string;
        borderWidth?: number;
    };
    signaturePosition?: {
        x: number; y: number;
        width?: number; height?: number;
        shape?: IDCardElementShape;
    };
    showSchoolHeader?: boolean;

    // Content Configuration
    showPhoto: boolean;
    showLogo: boolean;
    showQRCode?: boolean;
    signatureText: string; // "Principal" or "Authority"

    // Fields to display
    fields: {
        id: string;
        label: string; // Display label e.g., "Roll No."
        key: string;   // Data key e.g., "rollNumber"
        bold: boolean;
        x?: number; // percentage (0-100)
        y?: number; // percentage (0-100)
        fontSize?: number; // text font size in pixels/pt
        fontColor?: string; // custom text color for this field
    }[];

    // Canva-style canvas elements (drag-drop mode)
    canvasElements?: IDCardCanvasElement[];
}


export interface Student {
    id: string;
    schoolId: string;

    // Admission Details
    admissionNumber: string; // APAAR ID / Registration No logic might map here
    rollNumber: string;
    name: string;
    firstName: string;
    lastName?: string;
    className: string;
    section: string;
    admissionDate?: string;
    photo?: string;
    status: 'Active' | 'Inactive' | 'Disabled' | 'Withdrawn';
    currentSessionId: string;

    // Extended Admission Fields (from external project)
    apaarId?: string;
    penNo?: string;
    registrationNo?: string; // Often same as admissionNumber but kept for flexibility
    enrollmentNo?: string;
    srNo?: string;
    generalRegistrationNo?: string;
    classAppliedFor?: string;
    stream?: string;
    siblingId?: string;
    siblingName?: string;
    referredBy?: string;
    rte?: 'Yes' | 'No'; // mapped from isRteStudent
    enrolledSession?: string;
    enrolledClass?: string;
    enrolledSection?: string;
    enrolledYear?: string;
    hasSpecialNeeds?: string;
    specialNeedsDetails?: string;
    disabilityType?: string;
    isBplStudent?: string;
    house?: string;
    houseBlock?: string;
    specialNeeds?: string; // Align with Prisma
    previousLastClass?: string;
    affiliatedBoard?: string;
    marksObtained?: string;
    percentageCGPA?: string;
    result?: string;
    recordDateHeightWeight?: string;

    // Languages
    firstLanguage?: string;
    secondLanguage?: string;
    thirdLanguage?: string;
    motherTongue?: string;

    // Personal Details
    dob: string;
    gender: string;
    bloodGroup: string;
    height?: string;
    weight?: string;
    measurementDate?: string; // Record date for last height/weight entry
    dobCertificate?: string; // URL

    // Contact Details
    phone: string; // mobileNo
    email?: string;
    alternateNumber?: string;
    whatsappNo?: string;
    studentType?: 'new' | 'old';

    // Previous Qualifications
    previousSchool?: string;
    previousClass?: string;
    qualification?: string;
    passYear?: string;
    qualRollNo?: string;
    obtMarks?: string;
    percentage?: string;
    previousStream?: string;
    lastSchoolAffiliatedTo?: string;
    isStudentDropout?: string;
    studentAdmissionType?: string;
    tcNo?: string; // transferCertificateNo
    tcDate?: string; // dateOfIssue
    tcFile?: string; // transferCertificateFile URL
    tcFileContent?: string; // Base64 content

    // Income, Caste & Domicile
    incomeApplicationNo?: string;
    casteApplicationNo?: string;
    domicileApplicationNo?: string;

    // Parent Details
    fatherName: string;
    fatherPhone?: string; // fatherMobile
    fatherOccupation?: string;
    fatherOfficialAddress?: string;
    fatherEmail?: string;
    fatherAadhar?: string;
    fatherPhoto?: string;

    motherName: string;
    motherPhone?: string; // motherMobile
    motherOccupation?: string;
    motherOfficialAddress?: string;
    motherEmail?: string;
    motherAadhar?: string;
    motherPhoto?: string;

    // Guardian Details
    guardianSelection?: string; // Father, Mother, Other
    guardianName?: string;
    guardianRelation?: string;
    guardianPhone?: string; // guardianMobile
    guardianOccupation?: string;
    guardianEmail?: string;
    guardianPhoto?: string;
    guardianAddress?: string;
    guardianDocName?: string;
    guardianDocFile?: string;
    guardianDocFileContent?: string;

    motherDocName?: string;
    motherDocFile?: string;
    motherDocFileContent?: string;

    fatherDocName?: string;
    fatherDocFile?: string;
    fatherDocFileContent?: string;

    miscDocuments?: { title: string; file: string; content?: string }[];

    // Religion & Category
    nationality?: string;
    religion?: string;
    category?: string;
    caste?: string;
    categoryCertificate?: string; // URL
    categoryCertificateFileContent?: string; // Base64 content

    // Address Details
    currentAddress: string;
    village?: string;
    locality?: string;
    postOffice?: string;
    policeStation?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;

    permanentAddress?: string;
    permanentVillage?: string;
    permanentLocality?: string;
    permanentPostOffice?: string;
    permanentPoliceStation?: string;
    permanentDistrict?: string;
    permanentCity?: string;
    permanentState?: string;
    permanentCountry?: string;
    permanentPincode?: string;

    // Bank Details
    bankAccountNo?: string; // accountNo
    bankName?: string;
    bankBranch?: string;
    ifscCode?: string;
    accountHolderName?: string;
    panNo?: string;

    // Official Bank Details (for fee collection etc maybe?)
    officialBankName?: string;
    officialBankBranch?: string;
    officialIfscCode?: string;
    officialAccountHolderName?: string;

    // Govt IDs
    aadhaarNo?: string;
    samagraId?: string; // SSWID / Family ID
    govtStudentId?: string;
    govtFamilyId?: string;

    // Files
    attachAadhar?: string;
    attachAadharContent?: string;
    govtStudentIdPhoto?: string;
    govtStudentIdPhotoContent?: string;
    govtFamilyIdPhoto?: string;
    govtFamilyIdPhotoContent?: string;

    // Other
    scholarshipId?: string;
    scholarshipPassword?: string;
    info?: string; // remark/note

    // Login Info (Optional)
    parentUsername?: string;
    studentUsername?: string;
    loginPassword?: string;  // Stored for school-admin reference only
    parentPasswordChanged?: boolean;
    parentLoginPassword?: string;

    // Disabling Metadata
    disableReason?: string;
    disableDate?: string;
    disableNote?: string;
}

export interface SectionConfig {
    sectionName: string;
    columns: 1 | 2 | 3 | 4; // 1, 2, 3, or 4
}

export interface AdmissionFormTemplate {
    id: string;
    name: string;
    description: string;
    icon?: string; // New: Custom icon name from Lucide
    config: StudentFormConfig[];
    sectionSettings?: SectionConfig[]; // New: Grid layout settings
    isDefault?: boolean;
    isSystem?: boolean;
}

export interface StudentProfileTemplate {
    id: string;
    name: string;
    description: string;
    icon?: string;
    config: StudentFormConfig[];
    sectionSettings?: SectionConfig[];
    isDefault?: boolean;
}

// --- ACCESSORIES MODULE ---

export interface AccessoryCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
}

export interface AccessoryFieldConfig {
    fieldName: string;
    label: string;
    isVisible: boolean;
    isRequired: boolean;
}

export interface AccessoryEntryLog {
    id: string;
    vendor: string;
    date: string;
    quantity: number;
    buyRate: number;
    sellRate: number;
    notes?: string;
}

export interface AccessorySessionStats {
    entryQuantity: number;
    totalQuantity: number;
    availableQuantity: number;
    logs?: AccessoryEntryLog[];
}

export interface AccessoryItem {
    id: string;
    categoryId: string;
    name: string;
    sku?: string;
    hsnCode?: string;
    description?: string;
    vendorDetails?: string;
    entryDate?: string;
    // Current Session Stats (for backwards compatibility/easy access)
    entryQuantity?: number;
    totalQuantity?: number;
    availableQuantity?: number;
    thresholdQuantity?: number;
    // New Session-Aware Data
    sessionData?: Record<string, AccessorySessionStats>;
    buyPrice?: number;
    sellPrice?: number;
    carryForward?: boolean;
    image?: string;
    attributes?: Record<string, string>; // e.g. { size: 'XL', gender: 'Male' }
}

export interface AccessorySaleItem {
    itemId: string;
    name: string;
    quantity: number;
    sellRate: number;
    total: number;
}

export interface AccessorySale {
    id: string;
    schoolId: string;
    studentId: string;
    studentName: string;
    className: string;
    section: string;
    items: AccessorySaleItem[];
    totalAmount: number;
    paymentMode: string;
    date: string;
    referenceNo?: string;
    remarks?: string;
    sessionName: string;
}

export interface AccessoryTemplate {
    id: string;
    name: string;
    description: string;
    categories: AccessoryCategory[];
    defaultItems?: AccessoryItem[];
    fieldConfig: AccessoryFieldConfig[];
    isDefault?: boolean;
}

export interface SubjectGroup {
    id: string;
    name: string;
    description?: string;
    category?: 'Core Subject' | 'Elective' | 'Optional';
}

export interface SubjectGroupType {
    id: string;
    name: string;
    color?: string;
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    type: 'Theory' | 'Practical';
    category?: 'Core Subject' | 'Elective' | 'Optional';
    groupType?: string;
    subjectGroupId?: string;
}

export interface CurriculumTemplate {
    id: string;
    name: string;
    languageGroups: {
        id: string;
        name: string;
        subjects: string[];
    }[];
    coreSubjects: string[];
    electiveGroups: {
        id: string;
        name: string;
        subjects: string[];
    }[];
    optionalGroups: {
        id: string;
        name: string;
        subjects: string[];
    }[];
}

export interface ClassSubjectAllocation {
    id: string;
    className: string;
    section?: string;
    templateId?: string;
    studentIds?: string[];
    coreSubjects?: string[]; // Subject IDs
    electiveGroups?: {
        id: string;
        name: string;
        subjects: string[]; // Subject IDs
    }[];
    optionalGroups?: {
        id: string;
        name: string;
        subjects: string[]; // Subject IDs
    }[];
}

export interface AdmissionApplication {
    id: string;
    schoolId: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
    // Core Fields
    firstName: string;
    lastName: string;
    name: string;
    dob?: string;
    gender?: string;
    className?: string;
    section?: string;
    bloodGroup?: string;
    // Parent Details
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
    // Contact
    phone?: string;
    email?: string;
    currentAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;

    // Enhanced Fields
    documents?: { name: string; url: string }[];
    paymentStatus?: 'Pending' | 'Paid';
    paymentReference?: string;
    paymentDate?: string;
    whatsapp?: string;
    isRte?: boolean;
    firstLanguage?: string;
    secondLanguage?: string;
    isSpecialNeeds?: boolean;
    specialNeedsDetails?: string;
    isTransfer?: boolean;
    tcDate?: string;
    tcUrl?: string;
    parentProfession?: string;
    reasonToJoin?: string;
    percentageCGPA?: string;
    category?: string;
    caste?: string;
    nationality?: string;
    penNo?: string;
    appointmentSchedule?: string;
    photo?: string;
    reviewedBy?: string;
    session?: string;

    // Extra Fields (all optional — comes from admission form config)
    [key: string]: any;
}

export interface TransportVehicle {
    id: string;
    vehicleNumber: string;
    model?: string;
    vehicleModel?: string; // added to match transport/page.tsx
    yearMade?: string;
    registrationNumber?: string;
    chassisNumber?: string;
    chasisNumber?: string; // added to match transport/page.tsx misspelling
    capacity: number;
    driverName?: string;
    driverLicense?: string;
    driverPhone?: string;
    notes?: string;
    photo?: string;
    vehicleType?: string;
    insuranceExpiry?: string; // added to match transport/page.tsx
}

export interface TransportStop {
    id: string;
    name: string;
    morningPickupTime?: string;
    eveningDropTime?: string;
    distanceKm: number;
    monthlyFee: number;
    order: number;
}

export interface TransportRoute {
    id: string;
    name: string;
    color?: string;
    vehicleId?: string;
    stops: TransportStop[];
    notes?: string;
    amount?: number;
    amountType?: string;
    startDate?: string;
    graceDays?: number;
    vehicleOn?: boolean;
}

export interface TransportVehicleType {
    id: string;
    name: string;
    color?: string;
}

export interface TransportDriver {
    id: string;
    name: string;
    phone: string;
    emergencyContact?: string;
    aadharNumber?: string;
    panNumber?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    licenseDocUrl?: string;
    address?: string;
    experience?: string;
    salaryAmount?: number;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankName?: string;
    otherDocsUrl?: string;
    documents?: { title: string; file: string; content?: string }[];
    notes?: string;
    photo?: string;
    dob?: string;
    dateOfJoining?: string;
    bloodGroup?: string;
}

export interface StudentTransportAllocation {
    id: string;
    studentId: string;
    routeId: string;
    stopId: string;
    effectiveFrom?: string;
    effectiveUntil?: string;
    activeMonths?: string[];
}
