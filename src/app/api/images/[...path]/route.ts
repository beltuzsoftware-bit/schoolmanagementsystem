import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data.json');
const DATA_IMAGES_DIR = path.resolve(path.dirname(DB_PATH), 'data-images');

// Serves images stored in the persistent data-images directory (next to data.json).
// This directory survives container restarts unlike /public/images which is ephemeral.
// Next.js 15: params is a Promise
export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const resolvedParams = await params;
        const imagePath = resolvedParams.path.join('/');
        // Sanitize path to prevent directory traversal
        const safe = imagePath.replace(/\.\./g, '').replace(/^\/+/, '');
        const fullPath = path.resolve(DATA_IMAGES_DIR, safe);

        if (!fs.existsSync(fullPath)) {
            return new NextResponse(null, { status: 404 });
        }

        const buffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase().replace('.', '');
        const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
        };
        const mime = mimeMap[ext] || 'application/octet-stream';

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': mime,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (e) {
        return new NextResponse(null, { status: 500 });
    }
}
