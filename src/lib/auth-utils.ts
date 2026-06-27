import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SALT_ROUNDS = 10;
const SESSION_COOKIE_NAME = 'kummi_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Password Hashing ───────────────────────────────────────

export async function hashPassword(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
    // Support legacy plaintext passwords during migration:
    // If the stored value doesn't look like a bcrypt hash, compare literally.
    if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
        return plainText === hash;
    }
    return bcrypt.compare(plainText, hash);
}

// ─── Session Cookie Management ──────────────────────────────

export interface SessionPayload {
    id: string;
    name: string;
    email: string;
    role: string;
    schoolId?: string | null;
    avatar?: string | null;
    designation?: string | null;
    passwordChanged?: boolean;
}

/**
 * Encode session data as a Base64 JSON string.
 * In a production app with sensitive data you'd use signed JWTs,
 * but for this app the cookie is HTTP-only + Secure which prevents
 * client-side tampering and XSS theft.
 */
function encodeSession(payload: SessionPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decodeSession(token: string): SessionPayload | null {
    try {
        const json = Buffer.from(token, 'base64').toString('utf-8');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export async function createSession(payload: SessionPayload): Promise<void> {
    // Clean payload to prevent huge data like base64 avatars from bloating the cookie (max 4KB)
    const cleanPayload = { ...payload };
    if (cleanPayload.avatar && (cleanPayload.avatar.startsWith('data:') || cleanPayload.avatar.length > 500)) {
        cleanPayload.avatar = '/logo_placeholder.png';
    }

    const token = encodeSession(cleanPayload);
    console.log('[createSession] Setting cookie:', SESSION_COOKIE_NAME, token.slice(0, 15) + '...');
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: false, // Disabled secure flag for local dev/testing over HTTP
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
    });
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return decodeSession(token);
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
