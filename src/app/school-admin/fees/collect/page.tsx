import { Suspense } from 'react';
import { readDb } from '@/lib/db';
import FeesCollection from '@/components/school-admin/fees/fees-collection';

export default async function CollectFeesPage() {
    const db = readDb();
    const students = db.students || [];

    const activeStudents = students.filter(s => (s.status || 'Active') === 'Active');

    return (
        <div className="h-full">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-6">Collect Fees</h1>
            <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold animate-pulse">Loading fees collection workspace...</div>}>
                <FeesCollection students={activeStudents} />
            </Suspense>
        </div>
    );
}
