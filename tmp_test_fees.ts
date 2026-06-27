import { getStudentType } from './src/lib/fees-helper';
import { Student } from './src/types';

const currentSession = '2026-2027';

const testCases = [
    {
        name: 'New student (no field, same session)',
        student: { enrolledSession: '2026-2027' } as Student,
        expected: 'new'
    },
    {
        name: 'Old student (no field, different session)',
        student: { enrolledSession: '2025-2026' } as Student,
        expected: 'old'
    },
    {
        name: 'Manual Old student (same session)',
        student: { enrolledSession: '2026-2027', studentType: 'old' } as Student,
        expected: 'old'
    },
    {
        name: 'Manual New student (different session)',
        student: { enrolledSession: '2025-2026', studentType: 'new' } as Student,
        expected: 'new'
    }
];

console.log('Testing getStudentType...');
testCases.forEach(tc => {
    const result = getStudentType(tc.student, currentSession);
    console.log(`[${tc.name}] Result: ${result}, Expected: ${tc.expected}, Status: ${result === tc.expected ? 'PASS' : 'FAIL'}`);
});
