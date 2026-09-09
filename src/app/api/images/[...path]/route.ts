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

        let targetFile: string | null = fs.existsSync(fullPath) ? fullPath : null;

        if (!targetFile) {
            const filename = path.basename(safe);
            const subDirs = ['students', 'staff', 'schools', 'templates', 'users'];

            // 1. Check if it exists in another subdirectory within DATA_IMAGES_DIR
            for (const sub of subDirs) {
                const altPath = path.resolve(DATA_IMAGES_DIR, sub, filename);
                if (fs.existsSync(altPath)) {
                    targetFile = altPath;
                    break;
                }
            }

            // 2. Self-healing fallback: search public/images/ and copy to DATA_IMAGES_DIR
            if (!targetFile) {
                const candidates = [
                    path.resolve(process.cwd(), 'public/images', safe),
                    path.resolve(process.cwd(), 'public', safe),
                    path.resolve(process.cwd(), '.next/standalone/public/images', safe),
                    path.resolve(process.cwd(), '.next/standalone/public', safe),
                    ...subDirs.map(s => path.resolve(process.cwd(), 'public/images', s, filename)),
                    ...subDirs.map(s => path.resolve(process.cwd(), '.next/standalone/public/images', s, filename)),
                ];

                for (const cand of candidates) {
                    if (fs.existsSync(cand)) {
                        const parentDir = path.dirname(fullPath);
                        if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
                        try {
                            fs.copyFileSync(cand, fullPath);
                            targetFile = fullPath;
                        } catch {
                            targetFile = cand;
                        }
                        break;
                    }
                }
            }
        }

        if (!targetFile) {
            return new NextResponse(null, { status: 404 });
        }

        const buffer = fs.readFileSync(targetFile);
        const ext = path.extname(targetFile).toLowerCase().replace('.', '');
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

