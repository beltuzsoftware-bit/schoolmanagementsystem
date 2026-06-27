import fs from 'fs';
import path from 'path';
import { SESSION_MONTHS, isFeeApplicableForMonth, calculateFineAmount } from '../src/lib/fees-helper';

const dbPath = path.resolve('data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const studentId = 'stu_1780589511150_7_py07g';
const student = {
    id: studentId,
    className: 'Class VIII',
    studentType: 'old'
};

const schoolDetails = db.schools.find(s => s.id === 's_1780586158265') || db.schools[0];
const feeGroups = db.feeGroups; // NO FILTER

const allTransactions = [
  {
    "schoolId": "s_1780586158265",
    "studentId": "stu_1780589511150_7_py07g",
    "monthIndex": 3,
    "year": 2026,
    "amount": 1350,
    "discount": 150,
    "fine": 1000,
    "baseAmount": 5000,
    "feeName": "Admission Fee",
    "overallDiscount": 0,
    "date": "2026-06-05T03:29:36.218Z",
    "mode": "Cash",
    "remarks": "Payment for Apr",
    "collectedBy": "Xaviers Admin",
    "id": "TXN-1780630176690-2zr3bbq2h",
    "invoiceNo": "REC-1003"
  }
];
const transactions = allTransactions;

const startMonth = schoolDetails?.sessionStartMonth || 1;
const monthGroups = {};
transactions.forEach(t => {
    if (!monthGroups[t.monthIndex]) monthGroups[t.monthIndex] = [];
    monthGroups[t.monthIndex].push(t);
});

const allMonthTransactions = {};
allTransactions.forEach(t => {
    if (t.studentId === student.id) {
        if (!allMonthTransactions[t.monthIndex]) allMonthTransactions[t.monthIndex] = [];
        allMonthTransactions[t.monthIndex].push(t);
    }
});

const flatFees = [];
const studentType = student.studentType?.toLowerCase() || 'new';

Object.entries(monthGroups).forEach(([mIdx, currentTxns]) => {
    const index = parseInt(mIdx);
    
    let remainingCurrentPaid = currentTxns.reduce((sum, t) => sum + t.amount, 0);
    let remainingCurrentDiscount = currentTxns.reduce((sum, t) => sum + (t.discount || 0), 0);

    const monthInfo = SESSION_MONTHS.find(m => m.index === index);
    const monthLongName = monthInfo?.full || `Month ${index + 1}`;
    const monthShortName = monthInfo?.name || `M${index + 1}`;

    const allMonthTxns = allMonthTransactions[index] || [];
    const currentTxnIds = new Set(currentTxns.map(t => t.id));
    const pastTxns = allMonthTxns.filter(t => !currentTxnIds.has(t.id));
    let remainingPastPaidAndDiscount = pastTxns.reduce((sum, t) => sum + t.amount + (t.discount || 0), 0);

    console.log(`monthIndex = ${index}, startMonth = ${startMonth}`);

    feeGroups.forEach(group => {
        const isGroupAssigned = group.assignedClasses.includes(student.className);
        console.log(`Group: "${group.name}". Assigned: ${isGroupAssigned}. Classes: ${JSON.stringify(group.assignedClasses)}`);
        
        group.fees.forEach(fee => {
            const isNewOnly = fee.isNewStudentOnly || fee.studentType === 'new';
            const isOldOnly = fee.isOldStudentOnly || fee.studentType === 'old';
            
            console.log(`  Checking fee: ${fee.feeName}`);
            console.log(`    isNewOnly: ${isNewOnly}, isOldOnly: ${isOldOnly}, studentType: ${studentType}`);
            if (isNewOnly && studentType === 'old') {
                console.log(`    Skipping: studentType is old, but fee is new only`);
                return;
            }
            if (isOldOnly && studentType === 'new') {
                console.log(`    Skipping: studentType is new, but fee is old only`);
                return;
            }

            const applicable = isFeeApplicableForMonth(fee, index, startMonth);
            console.log(`    isFeeApplicableForMonth: ${applicable}`);
            if (applicable) {
                const amount = fee.amount || 0;
                const fine = calculateFineAmount(fee, index, startMonth);
                const itemGross = (amount + fine);

                const assignedPast = Math.min(remainingPastPaidAndDiscount, itemGross);
                remainingPastPaidAndDiscount -= assignedPast;

                const itemRemainingAfterPast = Math.max(0, itemGross - assignedPast);

                const feeDiscount = remainingCurrentDiscount;
                
                const itemRemainingAfterDiscount = Math.max(0, itemRemainingAfterPast - feeDiscount);
                const assignedCurrentPaid = Math.min(remainingCurrentPaid, itemRemainingAfterDiscount);
                remainingCurrentPaid -= assignedCurrentPaid;

                console.log(`    currentPaid assigned: ${assignedCurrentPaid}`);
                
                flatFees.push({
                    monthIndex: index,
                    monthLongName,
                    monthShortName,
                    name: fee.feeName,
                    amount: amount,
                    fine: fine,
                    discount: feeDiscount,
                    previousPaid: assignedPast,
                    currentPaid: assignedCurrentPaid
                });
            }
        });
    });
});
