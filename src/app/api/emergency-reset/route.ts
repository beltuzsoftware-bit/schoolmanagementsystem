import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const DB_PATH = path.resolve(process.cwd(), 'data.json');
    
    try {
        if (!fs.existsSync(DB_PATH)) {
            return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
        }

        const data = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(data);

        // Backup
        fs.writeFileSync(`${DB_PATH}.pre_wipe.bak`, data);

        // Perform the wipe
        const studentCount = db.students?.length || 0;
        db.students = [];
        db.feeTransactions = [];
        db.admissionApplications = [];
        db.accessorySales = [];

        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

        return NextResponse.json({
            message: '✅ Database successfuly reset to Clean Slate state!',
            details: `Wiped ${studentCount} students and all transactions. Schools and settings preserved.`,
            nextSteps: 'You can now create a few students manually to begin testing. PLEASE DELETE THIS FILE: src/app/api/emergency-reset/route.ts'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
