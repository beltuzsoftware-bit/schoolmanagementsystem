import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'kummi_session';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/apply', '/api/auth/login', '/api/auth/logout'];

// Role-based route access control
const ROLE_ROUTE_MAP: Record<string, string[]> = {
    SUPER_ADMIN: ['/super-admin', '/school-admin'],
    ROOT: ['/root', '/school-admin'],
    SCHOOL_ADMIN: ['/school-admin'],
    STAFF: ['/school-admin'],
    STUDENT: ['/student', '/change-password'],
    PARENT: ['/parent', '/change-password'],
};

function decodeSession(token: string): any | null {
    try {
        const json = Buffer.from(token, 'base64').toString('utf-8');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes, static files, and Next.js internals
    if (
        PUBLIC_ROUTES.some(route => pathname.startsWith(route)) ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') ||
        pathname === '/favicon.ico' ||
        pathname.startsWith('/images') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.ico') ||
        pathname === '/'
    ) {
        return NextResponse.next();
    }

    // Check for session cookie
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
        // No session — redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Decode and validate session
    const session = decodeSession(sessionToken);
    if (!session || !session.role) {
        // Invalid session — clear cookie and redirect
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
    }

    // Role-based access control
    const allowedRoutes = ROLE_ROUTE_MAP[session.role] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

    if (!hasAccess) {
        // User doesn't have access to this route — redirect to their default route
        const defaultRoute = allowedRoutes[0] || '/login';
        return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
