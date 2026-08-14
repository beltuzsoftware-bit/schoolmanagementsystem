'use server';

import { readDb, writeDb } from '@/lib/db';
import { verifyPassword, hashPassword, createSession, SessionPayload } from '@/lib/auth-utils';
import { UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

function checkDriverLicenseExpiry(user: any): { isExpired: boolean; error?: string } {
    if (user.role !== 'STAFF') return { isExpired: false };

    try {
        const db = readDb();
        const driver = (db.transportDrivers || []).find((d: any) =>
            (d.name && user.name && d.name.toLowerCase() === user.name.toLowerCase()) ||
            (d.phone && user.email && d.phone === user.email)
        );
        if (driver && driver.licenseExpiry) {
            const expiryDate = new Date(driver.licenseExpiry);
            if (!isNaN(expiryDate.getTime())) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                expiryDate.setHours(0, 0, 0, 0);
                if (expiryDate.getTime() < today.getTime()) {
                    return {
                        isExpired: true,
                        error: 'Your driving license has expired. You cannot login until it is updated by the administrator.'
                    };
                }
            }
        }
    } catch (e) {
        console.error('Error checking driver license expiry during login:', e);
    }
    return { isExpired: false };
}

export async function authenticateUser(identifier: string, pass: string) {
    const db = readDb();

    // 1. Check Standard Users (Admins, Root, Staff) from local JSON DB
    for (const u of (db.users || [])) {
        if (u.email === identifier || u.name === identifier) {
            const passwordValid = await verifyPassword(pass, u.password || '');
            if (passwordValid) {
                const licenseCheck = checkDriverLicenseExpiry(u);
                if (licenseCheck.isExpired) {
                    return { success: false, error: licenseCheck.error };
                }

                // Create HTTP-only session cookie
                const sessionPayload: SessionPayload = {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    schoolId: u.schoolId || null,
                    avatar: u.avatar || null,
                    designation: u.designation || null,
                };
                await createSession(sessionPayload);

                return { success: true, user: u as any };
            }
        }
    }

    // 2. Check Student Logins
    for (const s of (db.students || [])) {
        if (s.studentUsername === identifier) {
            const passwordValid = await verifyPassword(pass, s.loginPassword || '');
            if (passwordValid) {
                if (s.status === 'Disabled') {
                    return { success: false, error: 'Your account has been disabled. Please contact the school administrator.' };
                }

                const sessionPayload: SessionPayload = {
                    id: s.id,
                    name: s.name,
                    email: s.studentUsername!,
                    role: 'STUDENT',
                    schoolId: s.schoolId,
                    passwordChanged: s.parentPasswordChanged !== false,
                };
                await createSession(sessionPayload);

                return {
                    success: true,
                    user: {
                        id: s.id,
                        name: s.name,
                        email: s.studentUsername!,
                        role: 'STUDENT' as UserRole,
                        schoolId: s.schoolId,
                        passwordChanged: s.parentPasswordChanged !== false
                    }
                };
            }
        }
    }

    // 3. Check Parent Logins (Mobile Number)
    for (const s of (db.students || [])) {
        if (s.parentUsername === identifier) {
            const passwordValid = await verifyPassword(pass, s.loginPassword || '');
            if (passwordValid) {
                if (s.status === 'Disabled') {
                    return { success: false, error: 'This parent account is linked to a disabled student record. Access denied.' };
                }

                const sessionPayload: SessionPayload = {
                    id: `parent_${identifier}`,
                    name: s.guardianName || s.fatherName || s.motherName || 'Parent',
                    email: identifier,
                    role: 'PARENT',
                    schoolId: s.schoolId,
                    passwordChanged: s.parentPasswordChanged !== false,
                };
                await createSession(sessionPayload);

                return {
                    success: true,
                    user: {
                        id: `parent_${identifier}`,
                        name: s.guardianName || s.fatherName || s.motherName || 'Parent',
                        email: identifier,
                        role: 'PARENT' as UserRole,
                        schoolId: s.schoolId,
                        passwordChanged: s.parentPasswordChanged !== false
                    }
                };
            }
        }
    }

    return { success: false, error: 'Invalid credentials' };
}

export async function getUsers(options?: {
    schoolId?: string;
    excludeRoles?: UserRole[]
}) {
    const db = readDb();
    let users = db.users;

    if (options?.schoolId) {
        users = users.filter(u => u.schoolId === options.schoolId);
    }

    if (options?.excludeRoles && options.excludeRoles.length > 0) {
        users = users.filter(u => !options.excludeRoles!.includes(u.role));
    }

    return users;
}

export async function addUser(data: Partial<any>) {
    const db = readDb();
    if (!data.email || !data.name || !data.role) return { success: false, error: 'Missing required fields' };
    if (db.users.some(u => u.email === data.email)) return { success: false, error: 'User with this email already exists' };

    // Hash the password before storing
    const rawPassword = data.password || generateRandomPassword();
    const hashedPassword = await hashPassword(rawPassword);

    const newUser: any = {
        id: randomUUID(),
        ...data,
        password: hashedPassword,
        status: 'Active'
    };

    db.users.push(newUser);
    writeDb(db);
    revalidatePath('/school-admin/roles');
    return { success: true, user: newUser };
}

export async function updateUser(id: string, data: Partial<any>) {
    // 1. Write to JSON DB (which converts base64 avatar to persistent /api/images/users/... URL)
    const db = readDb();
    const index = db.users.findIndex(u => u.id === id);

    let hashedPassword = undefined;
    if (data.password) {
        hashedPassword = await hashPassword(data.password);
        data.password = hashedPassword;
    }

    if (index !== -1) {
        db.users[index] = { ...db.users[index], ...data };
        writeDb(db);
    }

    const updatedUser = index !== -1 ? db.users[index] : null;
    const finalAvatar = updatedUser?.avatar || data.avatar;

    // 2. Sync to Prisma DB if available
    try {
        const prismaUpdateData: any = {};
        if (data.name) prismaUpdateData.name = data.name;
        if (finalAvatar) prismaUpdateData.avatar = finalAvatar;
        if (hashedPassword) prismaUpdateData.password = hashedPassword;

        if (Object.keys(prismaUpdateData).length > 0) {
            await prisma.user.update({
                where: { id },
                data: prismaUpdateData
            });
        }
    } catch (e: any) {
        console.warn('[HYBRID] Prisma updateUser failed:', e.message);
    }

    revalidatePath('/school-admin/roles');
    revalidatePath('/school-admin/user-profile');
    return { success: true, user: updatedUser || data };
}

export async function deleteUser(id: string) {
    const db = readDb();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return { success: false, error: 'User not found' };
    db.users.splice(index, 1);
    writeDb(db);
    revalidatePath('/school-admin/roles');
    return { success: true };
}

export async function getTemplateDemoStudent(schoolId: string, searchName?: string) {
    const db = readDb();
    if (!db.students) return null;
    if (searchName) {
        const studentNameLower = searchName.toLowerCase();
        const found = db.students.find((s: any) => s.schoolId === schoolId && (s.name?.toLowerCase().includes(studentNameLower) || s.firstName?.toLowerCase().includes(studentNameLower)));
        if (found) return found;
    }
    return null;
}

export async function getSessionUser(): Promise<SessionPayload | null> {
    const { getSession } = await import('@/lib/auth-utils');
    return getSession();
}

export async function logoutUser(): Promise<void> {
    const { destroySession } = await import('@/lib/auth-utils');
    await destroySession();
}

// ─── Helpers ────────────────────────────────────────────────

function generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
}
