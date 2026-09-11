import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get('file');

        if (!filename || !filename.startsWith('KuMMi_Portable_Backup_') || !filename.endsWith('.zip')) {
            return NextResponse.json({ error: 'Invalid backup file name' }, { status: 400 });
        }

        // Clean any path traversal attempts
        const safeName = path.basename(filename);
        const filePath = path.join(process.cwd(), safeName);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
        }

        const fileBuffer = await fs.promises.readFile(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${safeName}"`,
                'Content-Type': 'application/zip',
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    } catch (e: any) {
        console.error('[backup download] Error:', e);
        return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
    }
}
