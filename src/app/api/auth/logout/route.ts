import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth-utils';

export async function POST() {
    try {
        await destroySession();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[LOGOUT API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to logout' },
            { status: 500 }
        );
    }
}

// Also support GET for simple link-based logout
export async function GET() {
    try {
        await destroySession();
        return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
    } catch {
        return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
    }
}
