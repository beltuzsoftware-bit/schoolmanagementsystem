'use server';

import { getSession, destroySession, SessionPayload } from '@/lib/auth-utils';

/**
 * Server action to get the current authenticated user session.
 * Used by layouts and components to check auth state server-side.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
    return getSession();
}

/**
 * Server action to log out the current user.
 * Clears the HTTP-only session cookie.
 */
export async function logout(): Promise<void> {
    await destroySession();
}
