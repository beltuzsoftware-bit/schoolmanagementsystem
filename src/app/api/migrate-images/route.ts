import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, writeDb } from '@/lib/db';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data.json');
const DATA_IMAGES_DIR = path.resolve(path.dirname(DB_PATH), 'data-images');

function extractBase64(items: any[], subDir: string, field: string, idField: string, urlSuffix: string): { items: any[], count: number } {
    const dir = path.join(DATA_IMAGES_DIR, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let count = 0;
    const result = items.map((item: any) => {
        if (item[field] && item[field].startsWith('data:image/')) {
            try {
                const match = item[field].match(/^data:image\/(\w+);base64,/);
                const ext = match ? match[1] : 'png';
                const filename = `${item[idField]}-${urlSuffix}.${ext}`;
                fs.writeFileSync(path.join(dir, filename), Buffer.from(item[field].replace(/^data:image\/\w+;base64,/, ''), 'base64'));
                item[field] = `/api/images/${subDir}/${filename}`;
                count++;
            } catch (e) {
                console.error(`[migrate-images] Failed to extract ${subDir}/${field}:`, e);
            }
        }
        // Also fix old /images/... paths (ephemeral) → copy to data-images/ and update URL
        else if (item[field] && item[field].startsWith('/images/')) {
            const oldPath = path.resolve(process.cwd(), 'public' + item[field]);
            if (fs.existsSync(oldPath)) {
                const filename = path.basename(item[field]);
                const newPath = path.join(dir, filename);
                if (!fs.existsSync(newPath)) {
                    fs.copyFileSync(oldPath, newPath);
                }
                item[field] = `/api/images/${subDir}/${filename}`;
                count++;
            }
        }
        return item;
    });
    return { items: result, count };
}

// One-time migration endpoint: Extracts all base64 images from the server's data.json
// into the persistent data-images/ directory and updates all URL references.
// Also fixes any old /images/... ephemeral paths to /api/images/... persistent paths.
export async function GET() {
    try {
        console.log('[migrate-images] Starting migration...');
        if (!fs.existsSync(DATA_IMAGES_DIR)) fs.mkdirSync(DATA_IMAGES_DIR, { recursive: true });

        const db = readDb() as any;
        const dbSizeBefore = JSON.stringify(db).length;

        const schoolResult = extractBase64(db.schools || [], 'schools', 'logo', 'id', 'logo');
        db.schools = schoolResult.items;

        const studentResult = extractBase64(db.students || [], 'students', 'photo', 'id', 'photo');
        db.students = studentResult.items;

        const staffResult = extractBase64(db.staffProfiles || [], 'staff', 'photo', 'id', 'photo');
        db.staffProfiles = staffResult.items;

        let templateBgCount = 0, templateLogoCount = 0;
        if (db.idCardTemplates) {
            const bgResult = extractBase64(db.idCardTemplates, 'templates', 'backgroundImage', 'id', 'bg');
            db.idCardTemplates = bgResult.items;
            templateBgCount = bgResult.count;

            const logoResult = extractBase64(db.idCardTemplates, 'templates', 'logo', 'id', 'logo');
            db.idCardTemplates = logoResult.items;
            templateLogoCount = logoResult.count;
        }

        // Write the updated db (use fs directly to avoid re-triggering extraction)
        const backup = `${DB_PATH}.premigrate.bak`;
        if (fs.existsSync(DB_PATH) && !fs.existsSync(backup)) fs.copyFileSync(DB_PATH, backup);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

        const dbSizeAfter = JSON.stringify(db).length;

        return NextResponse.json({
            success: true,
            message: 'Migration complete! All images moved to persistent data-images/ directory.',
            extracted: {
                schoolLogos: schoolResult.count,
                studentPhotos: studentResult.count,
                staffPhotos: staffResult.count,
                templateBackgrounds: templateBgCount,
                templateLogos: templateLogoCount,
            },
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
