import { calculateFineAmount } from './src/lib/fees-helper';
import { FeeInGroup } from './src/types/fees';

const testFee: FeeInGroup = {
    feeName: 'Tuition Fee',
    appliesTo: 'all',
    amount: 2100,
    dueDate: '2026-04-01',
    fineAmount: 12,
    fineType: 'fixed',
    fineInterval: 1,
    paymentFrequency: 'monthly'
};

const now = new Date(2026, 3, 6); // April 6, 2026
const monthIdx = 3; // April
const startMonth = 4; // HMS starts in April

const fine = calculateFineAmount(testFee, monthIdx, startMonth, now);
console.log(`Fine calculated for ${testFee.feeName}: ₹${fine}`);
if (fine === 60) {
    console.log('Test Passed: Correctly calculated ₹60 fine (5 days late * ₹12)');
} else {
    console.log(`Test Failed: Expected ₹60, got ₹${fine}`);
}

// Test period of 2 days
const testFee2: FeeInGroup = { ...testFee, fineInterval: 2 };
const fine2 = calculateFineAmount(testFee2, monthIdx, startMonth, now);
console.log(`Fine with 2-day interval: ₹${fine2}`);
// 5 days late / 2 days = 2 periods (floor)
if (fine2 === 24) {
    console.log('Test Passed: Correctly calculated ₹24 fine (2 periods * ₹12)');
} else {
    console.log(`Test Failed: Expected ₹24, got ₹${fine2}`);
}
