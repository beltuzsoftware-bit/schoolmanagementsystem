import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, DATA_IMAGES_DIR, DB_PATH } from '@/lib/db';
import JSZip from 'jszip';

function getDirectoryMetrics(dirPath: string): { totalBytes: number; fileCount: number; subfolders: Record<string, number> } {
    let totalBytes = 0;
    let fileCount = 0;
    const subfolders: Record<string, number> = {};

    if (!fs.existsSync(dirPath)) {
        return { totalBytes: 0, fileCount: 0, subfolders: {} };
    }

    function scan(current: string, subName = 'root') {
        const items = fs.readdirSync(current, { withFileTypes: true });
        for (const item of items) {
            const full = path.join(current, item.name);
            if (item.isDirectory()) {
                scan(full, item.name);
            } else if (item.isFile()) {
                const stat = fs.statSync(full);
                totalBytes += stat.size;
                fileCount++;
                subfolders[subName] = (subfolders[subName] || 0) + 1;
            }
        }
    }

    scan(dirPath);
    return { totalBytes, fileCount, subfolders };
}

export async function GET() {
    try {
        const db = readDb();
        const metrics = getDirectoryMetrics(DATA_IMAGES_DIR);

        const totalStudents = (db.students || []).length;
        let photosLinked = 0;
        let photosMissing = 0;

        (db.students || []).forEach((s: any) => {
            if (s.photo) {
                // Check if file actually exists on disk
                const cleanName = path.basename(s.photo);
                const onDiskPath = path.join(DATA_IMAGES_DIR, 'students', cleanName);
                if (fs.existsSync(onDiskPath)) {
                    photosLinked++;
                } else {
                    photosMissing++;
                }
            } else {
                photosMissing++;
            }
        });

        const dbStat = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            storage: {
                volumeMounted: fs.existsSync(DATA_IMAGES_DIR),
                path: DATA_IMAGES_DIR,
                totalBytes: metrics.totalBytes,
                totalMb: (metrics.totalBytes / (1024 * 1024)).toFixed(2),
                fileCount: metrics.fileCount,
                subfolders: metrics.subfolders,
            },
            database: {
                totalStudents,
                photosLinked,
                photosMissing,
                healthPercentage: totalStudents > 0 ? Math.round((photosLinked / totalStudents) * 100) : 100,
                dbSizeBytes: dbStat ? dbStat.size : 0,
                dbSizeKb: dbStat ? (dbStat.size / 1024).toFixed(1) : '0',
                lastModified: dbStat ? dbStat.mtime.toISOString() : null,
            }
        });
    } catch (e: any) {
        console.error('[system-health] Error calculating metrics:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const action = body.action || 'backup';

        if (action === 'backup') {
            // Build full system backup ZIP in memory
            const zip = new JSZip();

            // 1. Add data.json
            if (fs.existsSync(DB_PATH)) {
                zip.file('data.json', fs.readFileSync(DB_PATH));
            }

            // 2. Add all files in DATA_IMAGES_DIR
            if (fs.existsSync(DATA_IMAGES_DIR)) {
                const addDirToZip = (dir: string, zipFolder: JSZip) => {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            addDirToZip(fullPath, zipFolder.folder(entry.name)!);
                        } else if (entry.isFile()) {
                            zipFolder.file(entry.name, fs.readFileSync(fullPath));
                        }
                    }
                };
                addDirToZip(DATA_IMAGES_DIR, zip.folder('data-images')!);
            }

            // Generate ZIP buffer
            const buffer = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            const filename = `KuMMi_Full_System_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;

            return new NextResponse(buffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (e: any) {
        console.error('[system-health] Error in POST:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
