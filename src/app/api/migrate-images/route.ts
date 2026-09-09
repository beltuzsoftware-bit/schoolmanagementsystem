import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, writeDb, saveBase64Image } from '@/lib/db';
import prisma from '@/lib/prisma';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data.json');
const DATA_IMAGES_DIR = path.resolve(path.dirname(DB_PATH), 'data-images');

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extractBase64(items: any[], subDir: string, field: string, idField: string, urlSuffix: string): { items: any[], count: number } {
    const dir = path.join(DATA_IMAGES_DIR, subDir);
    ensureDir(dir);
    let count = 0;
    const result = items.map((item: any) => {
        if (item[field] && item[field].startsWith('data:image/')) {
            try {
                item[field] = saveBase64Image(item[field], subDir, item[idField], urlSuffix);
                count++;
            } catch (e) {
                console.error(`[migrate-images] Failed to extract ${subDir}/${field}:`, e);
            }
        }
        // Fix old /images/... paths (ephemeral) → copy to data-images/ and update URL
        else if (item[field] && item[field].startsWith('/images/')) {
            const relPath = item[field].replace(/^\/images\//, '');
            const oldPath = path.resolve(process.cwd(), 'public/images', relPath);
            const filename = path.basename(item[field]);
            const newPath = path.join(dir, filename);

            if (fs.existsSync(oldPath)) {
                if (!fs.existsSync(newPath)) {
                    fs.copyFileSync(oldPath, newPath);
                }
                item[field] = `/api/images/${subDir}/${filename}`;
                count++;
            } else if (fs.existsSync(newPath)) {
                item[field] = `/api/images/${subDir}/${filename}`;
                count++;
            }
        }
        return item;
    });
    return { items: result, count };
}

// Scans all .bak and backup files in DB directory to recover base64 photos for items whose files are missing
function recoverFromBackups(db: any, subDir: string, field: string, idField: string, urlSuffix: string): number {
    const dir = path.join(DATA_IMAGES_DIR, subDir);
    ensureDir(dir);
    const dbDir = path.dirname(DB_PATH);

    // Find candidate backup files
    const backupFiles: string[] = [];
    try {
        const entries = fs.readdirSync(dbDir);
        for (const entry of entries) {
            if (entry.startsWith('data.json') && entry !== 'data.json' && (entry.endsWith('.bak') || entry.includes('.bak') || entry.endsWith('.json'))) {
                backupFiles.push(path.join(dbDir, entry));
            }
        }
    } catch {}

    if (backupFiles.length === 0) return 0;

    let recoveredCount = 0;
    const items = db[subDir === 'students' ? 'students' : subDir === 'staff' ? 'staffProfiles' : subDir === 'schools' ? 'schools' : 'users'] || [];

    for (const item of items) {
        const currentVal = item[field];
        const itemId = item[idField] || item.id;
        if (!itemId) continue;

        // Check if current photo file actually exists on disk
        let fileExists = false;
        if (currentVal && (currentVal.startsWith('/api/images/') || currentVal.startsWith('/images/'))) {
            const filename = path.basename(currentVal);
            if (fs.existsSync(path.join(dir, filename))) {
                fileExists = true;
            }
        }

        if (fileExists) continue;

        // Missing file on disk! Search backup files for base64 photo
        for (const backupPath of backupFiles) {
            try {
                const raw = fs.readFileSync(backupPath, 'utf8');
                if (!raw.includes(itemId)) continue;
                const backupDb = JSON.parse(raw);
                const backupList = backupDb[subDir === 'students' ? 'students' : subDir === 'staff' ? 'staffProfiles' : subDir === 'schools' ? 'schools' : 'users'] || [];
                const matched = backupList.find((b: any) => b[idField] === itemId || b.id === itemId || (item.name && b.name === item.name));

                if (matched && matched[field] && matched[field].startsWith('data:image/')) {
                    item[field] = saveBase64Image(matched[field], subDir, itemId, urlSuffix);
                    recoveredCount++;
                    console.log(`[migrate-images] Recovered photo for ${item.name || itemId} from ${path.basename(backupPath)}`);
                    break;
                }
            } catch (err) {
                // Ignore corrupted backup file
            }
        }
    }

    return recoveredCount;
}

// Consolidates all files from public/images into data-images
function syncPublicImages(): number {
    const publicImagesDir = path.resolve(process.cwd(), 'public/images');
    if (!fs.existsSync(publicImagesDir)) return 0;
    let copied = 0;

    const copyRecursive = (srcDir: string, destDir: string) => {
        ensureDir(destDir);
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            if (entry.isDirectory()) {
                copyRecursive(srcPath, destPath);
            } else if (entry.isFile()) {
                if (!fs.existsSync(destPath)) {
                    try {
                        fs.copyFileSync(srcPath, destPath);
                        copied++;
                    } catch {}
                }
            }
        }
    };

    try {
        copyRecursive(publicImagesDir, DATA_IMAGES_DIR);
    } catch {}

    return copied;
}

export async function GET() {
    try {
        console.log('[migrate-images] Starting migration & self-healing scan...');
        ensureDir(DATA_IMAGES_DIR);
        ['students', 'staff', 'schools', 'templates', 'users'].forEach(sub => {
            ensureDir(path.join(DATA_IMAGES_DIR, sub));
        });

        // 1. Sync public/images files to data-images/
        const publicSynced = syncPublicImages();

        // 2. Read DB
        const db = readDb() as any;
        const dbSizeBefore = JSON.stringify(db).length;

        // 3. Extract base64 and normalize paths in active data.json
        const schoolResult = extractBase64(db.schools || [], 'schools', 'logo', 'id', 'logo');
        db.schools = schoolResult.items;

        const studentResult = extractBase64(db.students || [], 'students', 'photo', 'id', 'photo');
        db.students = studentResult.items;

        const staffResult = extractBase64(db.staffProfiles || [], 'staff', 'photo', 'id', 'photo');
        db.staffProfiles = staffResult.items;

        const userResult = extractBase64(db.users || [], 'users', 'avatar', 'id', 'avatar');
        db.users = userResult.items;

        let templateBgCount = 0, templateLogoCount = 0;
        if (db.idCardTemplates) {
            const bgResult = extractBase64(db.idCardTemplates, 'templates', 'backgroundImage', 'id', 'bg');
            db.idCardTemplates = bgResult.items;
            templateBgCount = bgResult.count;

            const logoResult = extractBase64(db.idCardTemplates, 'templates', 'logo', 'id', 'logo');
            db.idCardTemplates = logoResult.items;
            templateLogoCount = logoResult.count;
        }

        // 4. Check for any missing files and recover from backups
        const recoveredStudents = recoverFromBackups(db, 'students', 'photo', 'id', 'photo');
        const recoveredStaff = recoverFromBackups(db, 'staff', 'photo', 'id', 'photo');

        // 5. Sync recovered students to Prisma DB if available
        let prismaSyncedStudents = 0;
        try {
            const studentsWithPhoto = (db.students || []).filter((s: any) => s.photo && s.photo.startsWith('/api/images/'));
            for (const s of studentsWithPhoto) {
                try {
                    await prisma.student.update({
                        where: { id: s.id },
                        data: { photo: s.photo }
                    });
                    prismaSyncedStudents++;
                } catch {}
            }
        } catch {}

        // 6. Write the updated db
        const backup = `${DB_PATH}.premigrate.bak`;
        if (fs.existsSync(DB_PATH) && !fs.existsSync(backup)) fs.copyFileSync(DB_PATH, backup);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

        const dbSizeAfter = JSON.stringify(db).length;

        // 7. Count files in data-images
        let totalFilesInDataImages = 0;
        try {
            const countDir = (d: string) => {
                if (!fs.existsSync(d)) return;
                for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                    if (e.isDirectory()) countDir(path.join(d, e.name));
                    else if (e.isFile()) totalFilesInDataImages++;
                }
            };
            countDir(DATA_IMAGES_DIR);
        } catch {}

        return NextResponse.json({
            success: true,
            message: 'Image persistence migration & self-healing complete!',
            extracted: {
                schoolLogos: schoolResult.count,
                studentPhotos: studentResult.count,
                staffPhotos: staffResult.count,
                userAvatars: userResult.count,
                templateBackgrounds: templateBgCount,
                templateLogos: templateLogoCount,
            },
            recoveredFromBackups: {
                studentPhotos: recoveredStudents,
                staffPhotos: recoveredStaff,
            },
            publicFilesConsolidated: publicSynced,
            totalPersistentImages: totalFilesInDataImages,
            prismaStudentsSynced: prismaSyncedStudents,
            dataImagesDir: DATA_IMAGES_DIR,
            sizeBefore: `${(dbSizeBefore / 1024 / 1024).toFixed(2)} MB`,
            sizeAfter: `${(dbSizeAfter / 1024 / 1024).toFixed(2)} MB`,
            reduction: `${(((dbSizeBefore - dbSizeAfter) / dbSizeBefore) * 100).toFixed(1)}%`,
        });
    } catch (error: any) {
        console.error('[migrate-images] Error:', error);
        return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
    }
}

