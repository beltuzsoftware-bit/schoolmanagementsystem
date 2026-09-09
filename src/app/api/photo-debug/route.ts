import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, DATA_IMAGES_DIR } from '@/lib/db';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';

        // 1. Read JSON DB
        const db = readDb() as any;
        const jsonStudents = (db.students || []).filter((s: any) => s.photo);

        // 2. Read Prisma DB if available
        let prismaStudents: any[] = [];
        let prismaError: string | null = null;
        try {
            prismaStudents = await prisma.student.findMany({
                where: {
                    photo: { not: null }
                },
                select: {
                    id: true,
                    name: true,
                    admissionNumber: true,
                    photo: true,
                    schoolId: true
                }
            });
        } catch (e: any) {
            prismaError = e?.message || String(e);
        }

        // 3. List all files in DATA_IMAGES_DIR recursively
        const diskFiles: string[] = [];
        const scanDir = (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) scanDir(full);
                else diskFiles.push(path.relative(DATA_IMAGES_DIR, full).replace(/\\/g, '/'));
            }
        };
        scanDir(DATA_IMAGES_DIR);

        // 4. Check sample students from screenshot
        const targets = ['MARIAM', 'DIEA', 'PALWASHA', 'SAKIB', 'FARIHA', 'TOWHID'];
        const sampleJson = jsonStudents
            .filter((s: any) => targets.some(t => (s.name || '').toUpperCase().includes(t)))
            .map((s: any) => ({
                id: s.id,
                name: s.name,
                admissionNumber: s.admissionNumber,
                photo: s.photo,
                photoType: s.photo?.startsWith('data:') ? 'base64' : s.photo?.startsWith('http') ? 'http' : 'path',
                photoLen: s.photo?.length,
                existsOnDisk: s.photo ? fs.existsSync(path.resolve(DATA_IMAGES_DIR, s.photo.replace(/^\/(api\/)?images\//, ''))) : false
            }));

        const samplePrisma = prismaStudents
            .filter((s: any) => targets.some(t => (s.name || '').toUpperCase().includes(t)))
            .map((s: any) => ({
                id: s.id,
                name: s.name,
                admissionNumber: s.admissionNumber,
                photo: s.photo,
                photoType: s.photo?.startsWith('data:') ? 'base64' : s.photo?.startsWith('http') ? 'http' : 'path',
                photoLen: s.photo?.length,
                existsOnDisk: s.photo ? fs.existsSync(path.resolve(DATA_IMAGES_DIR, s.photo.replace(/^\/(api\/)?images\//, ''))) : false
            }));

        // 5. Look for any other json files or backup files in DB directory
        const dbDir = path.dirname(process.env.DB_PATH || path.resolve(process.cwd(), 'data.json'));
        const dbDirFiles = fs.existsSync(dbDir) ? fs.readdirSync(dbDir).filter(f => f.includes('json') || f.includes('bak')) : [];

        return NextResponse.json({
            DATA_IMAGES_DIR,
            totalJsonStudentsWithPhoto: jsonStudents.length,
            totalPrismaStudentsWithPhoto: prismaStudents.length,
            prismaError,
            dbDirFiles,
            sampleJson,
            samplePrisma,
            first20DiskFiles: diskFiles.slice(0, 20),
            totalDiskFiles: diskFiles.length
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
}
