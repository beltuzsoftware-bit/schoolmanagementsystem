import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

// One-time migration endpoint: Reads the server's data.json, 
// triggers writeDb which auto-extracts all base64 images to public/images/,
// then writes the cleaned data.json back. Call this once after deployment.
export async function GET() {
    try {
        console.log('[migrate-images] Starting base64 image extraction migration...');
        
        const db = readDb();
        
        // Count base64 images before migration
        const schoolsWithBase64 = db.schools?.filter((s: any) => s.logo?.startsWith('data:image/')).length || 0;
        const studentsWithBase64 = db.students?.filter((s: any) => s.photo?.startsWith('data:image/')).length || 0;
        const staffWithBase64 = db.staffProfiles?.filter((s: any) => s.photo?.startsWith('data:image/')).length || 0;
        const templatesWithBase64Bg = db.idCardTemplates?.filter((t: any) => t.backgroundImage?.startsWith('data:image/')).length || 0;
        const templatesWithBase64Logo = db.idCardTemplates?.filter((t: any) => t.logo?.startsWith('data:image/')).length || 0;
        
        const dbSizeBefore = JSON.stringify(db).length;
        
        console.log(`[migrate-images] Found: ${schoolsWithBase64} school logos, ${studentsWithBase64} student photos, ${staffWithBase64} staff photos, ${templatesWithBase64Bg} template backgrounds, ${templatesWithBase64Logo} template logos to extract`);
        
        // writeDb will automatically extract all base64 images
        writeDb(db);
        
        // Re-read to measure size after
        const dbAfter = readDb();
        const dbSizeAfter = JSON.stringify(dbAfter).length;
        
        return NextResponse.json({
            success: true,
            message: 'Base64 image migration complete!',
            extracted: {
                schoolLogos: schoolsWithBase64,
                studentPhotos: studentsWithBase64,
                staffPhotos: staffWithBase64,
                templateBackgrounds: templatesWithBase64Bg,
                templateLogos: templatesWithBase64Logo,
            },
            sizeBefore: `${(dbSizeBefore / 1024 / 1024).toFixed(2)} MB`,
            sizeAfter: `${(dbSizeAfter / 1024 / 1024).toFixed(2)} MB`,
            reduction: `${(((dbSizeBefore - dbSizeAfter) / dbSizeBefore) * 100).toFixed(1)}%`,
        });
    } catch (error: any) {
        console.error('[migrate-images] Error:', error);
        return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
    }
}
