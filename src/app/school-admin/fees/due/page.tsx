import { readDb } from '@/lib/db';
import DueFeesList from '@/components/school-admin/fees/due-fees-list';

export default async function SearchDueFeesPage() {
    const db = readDb();
    const students = db.students || [];

    const activeStudents = students.filter(s => (s.status || 'Active') === 'Active');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 mb-2">
                <h1 className="text-3xl font-black bg-gradient-to-r from-red-600 via-red-800 to-slate-900 bg-clip-text text-transparent uppercase tracking-tight">Due Fees Search</h1>
                <p className="text-slate-500 font-medium">Find and manage outstanding fee payments across all classes.</p>
            </div>
            <DueFeesList students={activeStudents} />
        </div>
    );
}
