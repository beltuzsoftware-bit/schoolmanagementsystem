'use client';

import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Calendar as CalendarIcon, Clock, Building, User as UserIcon } from 'lucide-react';
import { StaffProfile } from '@/types/staff';
import { User, School } from '@/types';
import { updatePayslipStatus } from '@/app/actions';
import { getCurrencySymbol } from '@/lib/utils';
import { numberToWords } from '@/lib/number-to-words';

interface PayslipModalProps {
    staff: StaffProfile;
    user: User;
    school: School;
    monthYear: string;
    payroll: {
        basic: number;
        hra: number;
        da: number;
        conv: number;
        grossSalary: number;
        pfDeduction: number;
        esiDeduction: number;
        pt: number;
        loanEMI: number;
        totalDeductions: number;
        netSalary: number;
        otEarnings: number;
        lossOfPay: number;
        reimbursementTotal: number;
        absents: number;
        monthlyWorkingDays: number;
        daysPresent: number;
        arrears?: number;
    };
    onClose: () => void;
}

const PayslipModal: React.FC<PayslipModalProps> = ({ staff, user, school, monthYear, payroll, onClose }) => {
    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr) || new Date().getFullYear();
    const monthIndex = (parseInt(monthStr) - 1) || new Date().getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[monthIndex];

    React.useEffect(() => {
        const originalTitle = document.title;
        document.title = `Payslip_${user.name.replace(/\s+/g, '_')}_${monthName}_${year}`;

        return () => {
            document.title = originalTitle;
        };
    }, [user.name, monthName, year]);

    const handlePrint = async () => {
        try {
            await updatePayslipStatus(staff.id, monthYear, 'Generated');
        } catch (e) {
            console.error('Payslip status update failed:', e);
        }
        window.print();
    };

    const currencySymbol = getCurrencySymbol(school.currency);
    const amountInWords = numberToWords(payroll.netSalary);

    // Filter dynamic allowances
    const otherAllowances = staff.allowances?.filter(al => !['HRA', 'DA', 'Conveyance', 'CONVEYANCE'].includes(al.label.toUpperCase())) || [];
    // Filter dynamic deductions
    const otherDeductions = staff.customDeductions?.filter(ded => !ded.label.toUpperCase().includes('PROF')) || [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
                {/* Header Actions Panel (Not printed) */}
                <div className="px-8 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 no-print">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <ShieldCheck size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">Payroll Center</h2>
                            <p className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Salary Slip Statement • Confidential</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <Printer size={15} /> PRINT STATEMENT
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Payslip Outer Sheet */}
                <div className="flex-grow overflow-y-auto p-6 md:p-12 bg-slate-50/50 scrollbar-hide">
                    {/* Printable area */}
                    <div id="printable-payslip" className="bg-white mx-auto shadow-sm print:shadow-none p-12 md:p-16 border border-slate-200 print:border-none relative min-h-full" style={{ width: '100%', maxWidth: '850px' }}>
                        
                        {/* Elegant Top Strip Decor */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800" />

                        {/* Top Section: Institution & Payslip Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start pb-8 border-b-2 border-slate-900 mb-8 relative z-10 gap-6">
                            <div className="flex gap-5 items-center">
                                {school.logo ? (
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 p-2 bg-white flex items-center justify-center shrink-0">
                                        <img src={school.logo} alt="logo" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-3xl font-black shrink-0">
                                        {school.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight uppercase">{school.name}</h1>
                                    <p className="text-[10px] font-bold text-slate-500 max-w-sm mt-1 uppercase tracking-wider">{school.address}</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Contact: {school.contactNumber || '-'} | Email: {school.email || '-'}</p>
                                </div>
                            </div>
                            <div className="text-left md:text-right shrink-0">
                                <span className="inline-block px-4 py-1.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.25em] mb-3 rounded-md">PAY SLIP STATEMENT</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pay Period</p>
                                <h3 className="text-lg font-black text-indigo-700 uppercase leading-none">{monthYear}</h3>
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Employee Info */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><UserIcon size={12} className="text-slate-400" /> Employee Profile</h4>
                                <table className="w-full text-xs">
                                    <tbody>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase w-36">Name</td><td className="py-2 font-black text-slate-800 uppercase">{user.name}</td></tr>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase">Employee ID</td><td className="py-2 font-black text-indigo-600">{staff.staffId || user.id}</td></tr>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase">Designation</td><td className="py-2 font-bold text-slate-800">{staff.designation}</td></tr>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase">Department</td><td className="py-2 font-bold text-slate-800">{staff.department}</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Payment/Bank Details & Attendance */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Building size={12} className="text-slate-400" /> Attendance & Payment Info</h4>
                                <table className="w-full text-xs">
                                    <tbody>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase w-36">Joining Date</td><td className="py-2 font-bold text-slate-800">{staff.joiningDate}</td></tr>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase">Bank Account</td><td className="py-2 font-mono font-bold text-slate-800">{staff.bankDetails?.accNo || '-'}</td></tr>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase">PF Account No.</td><td className="py-2 font-mono font-bold text-slate-800">{staff.bankDetails?.pfAccNo || '-'}</td></tr>
                                        <tr className="border-b border-slate-100"><td className="py-2 font-bold text-slate-500 uppercase">Working / Attended</td><td className="py-2 font-bold text-slate-800">{payroll.monthlyWorkingDays} / {payroll.daysPresent} Days</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Statement Financial Table */}
                        <div className="border-2 border-slate-900 rounded-xl overflow-hidden mb-8">
                            <div className="grid grid-cols-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest divide-x-2 divide-slate-800">
                                <div className="px-5 py-2.5">Earnings Details</div>
                                <div className="px-5 py-2.5">Deductions Details</div>
                            </div>
                            
                            <div className="grid grid-cols-2 divide-x-2 divide-slate-200 text-xs min-h-[220px]">
                                {/* Earnings List */}
                                <div className="flex flex-col justify-between h-full bg-white">
                                    <div className="divide-y divide-slate-100">
                                        <TableRowItem label="Basic Salary" value={payroll.basic} symbol={currencySymbol} />
                                        {payroll.hra > 0 && <TableRowItem label="HRA Allowances" value={payroll.hra} symbol={currencySymbol} />}
                                        {payroll.da > 0 && <TableRowItem label="DA Allowances" value={payroll.da} symbol={currencySymbol} />}
                                        {payroll.conv > 0 && <TableRowItem label="Conveyance" value={payroll.conv} symbol={currencySymbol} />}
                                        {payroll.otEarnings > 0 && <TableRowItem label="Overtime Compensation" value={payroll.otEarnings} symbol={currencySymbol} />}
                                        {payroll.reimbursementTotal > 0 && <TableRowItem label="Variable / Reimbursement" value={payroll.reimbursementTotal} symbol={currencySymbol} />}
                                        {payroll.arrears && payroll.arrears > 0 ? <TableRowItem label="Arrears (Carried Forward)" value={payroll.arrears} symbol={currencySymbol} /> : null}
                                        {otherAllowances.map((al, idx) => (
                                            <TableRowItem key={al.id || idx} label={al.label} value={al.amount} symbol={currencySymbol} />
                                        ))}
                                    </div>
                                    <div className="mt-auto bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center font-black text-slate-900 uppercase">
                                        <span>Gross Earnings</span>
                                        <span>{currencySymbol} {payroll.grossSalary.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Deductions List */}
                                <div className="flex flex-col justify-between h-full bg-white">
                                    <div className="divide-y divide-slate-100">
                                        <TableRowItem label="PF Contribution" value={payroll.pfDeduction} symbol={currencySymbol} isDeduction />
                                        <TableRowItem label="ESI Contribution" value={payroll.esiDeduction} symbol={currencySymbol} isDeduction />
                                        {payroll.pt > 0 && <TableRowItem label="Professional Tax" value={payroll.pt} symbol={currencySymbol} isDeduction />}
                                        {payroll.loanEMI > 0 && <TableRowItem label="Advance / Loan Repayment" value={payroll.loanEMI} symbol={currencySymbol} isDeduction />}
                                        {payroll.lossOfPay > 0 && <TableRowItem label={`Loss of Pay (${payroll.absents} Absents)`} value={payroll.lossOfPay} symbol={currencySymbol} isDeduction />}
                                        {otherDeductions.map((ded, idx) => (
                                            <TableRowItem key={ded.id || idx} label={ded.label} value={ded.amount} symbol={currencySymbol} isDeduction />
                                        ))}
                                    </div>
                                    <div className="mt-auto bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center font-black text-rose-600 uppercase">
                                        <span>Total Deductions</span>
                                        <span>{currencySymbol} {payroll.totalDeductions.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Net Pay Callout Block */}
                        <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Net Payable Salary</p>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{currencySymbol} {payroll.netSalary.toLocaleString()}</h3>
                                <p className="text-[10px] font-bold text-indigo-700 uppercase mt-2 tracking-wide font-mono">Amount In Words: {amountInWords} Only</p>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed text-left md:text-right">
                                <p>Payment Method: <span className="font-black text-slate-800">{staff.paymentMode || 'Bank Transfer'}</span></p>
                                <p>Transaction status: <span className="font-black text-green-700">AUTHORIZED</span></p>
                            </div>
                        </div>

                        {/* Signatures & Verification Details */}
                        <div className="grid grid-cols-2 gap-12 mt-20 pt-8 border-t border-slate-200">
                            <div>
                                <div className="h-12 flex items-end justify-start font-mono text-[11px] text-slate-400 italic">
                                    {/* Place for signature / signee */}
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-2 w-48">Employee Signature</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="h-12 flex items-center justify-end">
                                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg text-indigo-700 text-[10px] font-black tracking-wide uppercase">
                                        <ShieldCheck size={12} />
                                        SYSTEM VERIFIED RECORD
                                    </div>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-2 w-48 text-right">Authorized Signature</p>
                            </div>
                        </div>

                        {/* Document Footer */}
                        <div className="mt-16 pt-6 border-t border-slate-100 flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            <div>
                                Statement Reference: KM-PAY-{monthYear}-{staff.id.slice(-6).toUpperCase()}
                            </div>
                            <div>
                                Generated On: {new Date().toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { 
                        size: portrait; 
                        margin: 0; 
                    }
                    
                    /* Hide non-printable items */
                    body * {
                        visibility: hidden !important;
                    }
                    
                    /* Clean background configuration */
                    html, body {
                        background: white !important;
                        height: 100% !important;
                        overflow: visible !important;
                    }

                    /* Print sheet container styling override */
                    #printable-payslip, 
                    #printable-payslip * {
                        visibility: visible !important;
                    }

                    #printable-payslip {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .no-print {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
            `}</style>
        </div>
    );
};

interface TableRowItemProps {
    label: string;
    value: number;
    symbol: string;
    isDeduction?: boolean;
}

const TableRowItem: React.FC<TableRowItemProps> = ({ label, value, symbol, isDeduction = false }) => {
    return (
        <div className="flex justify-between items-center px-5 py-3 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-600 font-medium">{label}</span>
            <span className={`font-black tabular-nums ${isDeduction ? 'text-rose-500' : 'text-slate-900'}`}>
                {isDeduction ? '-' : ''}{symbol} {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
        </div>
    );
};

export default PayslipModal;
