import { NextResponse } from 'next/server';
import { readDb, writeDb, saveBase64Image } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { updates } = body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        const db = readDb();
        let restoredCount = 0;

        for (const item of updates) {
            const { studentId, photoBase64 } = item;
            if (!studentId || !photoBase64) continue;

            const student = db.students?.find((s: any) => s.id === studentId);
            if (student) {
                const savedPath = saveBase64Image(photoBase64, 'students', student.id, 'photo');
                student.photo = savedPath;
                restoredCount++;
            }
        }

        writeDb(db);
        return NextResponse.json({ success: true, count: restoredCount });
    } catch (e: any) {
        console.error('[restore-photos] Error updating student photos:', e);
        return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
    }
}
