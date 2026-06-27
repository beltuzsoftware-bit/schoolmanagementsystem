import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/app/actions/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { identifier, password } = body;

        if (!identifier || !password) {
            return NextResponse.json(
                { success: false, error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const result = await authenticateUser(identifier, password);

        if (result.success && result.user) {
            // Session cookie is already set by authenticateUser via createSession()
            return NextResponse.json({
                success: true,
                user: {
                    id: result.user.id,
                    name: result.user.name,
                    email: result.user.email,
                    role: result.user.role,
                    schoolId: result.user.schoolId,
                    avatar: result.user.avatar,
                    designation: result.user.designation,
                    passwordChanged: result.user.passwordChanged,
                }
            });
        }

        return NextResponse.json(
            { success: false, error: result.error || 'Invalid credentials' },
            { status: 401 }
        );
    } catch (error: any) {
        console.error('[LOGIN API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
