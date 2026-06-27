import { redirect } from 'next/navigation';
import { getSchools, getSchoolAdmin } from '@/app/actions';

interface Props {
    params: Promise<{ schoolCode: string }>;
}

/**
 * This page resolves a school by its schoolId code (e.g. HMS2019) or a
 * URL-encoded name slug and then redirects straight to the school-admin
 * portal with impersonation credentials embedded in the URL.
 *
 * This lets super-admins right-click a school name → "Open in new tab"
 * and have the school admin dashboard open directly.
 */
export default async function SchoolLoginPage({ params }: Props) {
    const { schoolCode } = await params;
    const decoded = decodeURIComponent(schoolCode);

    const schools = await getSchools();

    // Match by schoolId (e.g. "HMS2019"), or by name slug (e.g. "Heritage-Model-School")
    const slugify = (name: string) =>
        name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const school = schools.find(
        (s: any) =>
            s.schoolId?.toLowerCase() === decoded.toLowerCase() ||
            s.code?.toLowerCase() === decoded.toLowerCase() ||
            slugify(s.name) === slugify(decoded)
    );

    if (!school) {
        redirect('/super-admin/schools?error=school-not-found');
    }

    const adminUser = await getSchoolAdmin(school.id);

    if (!adminUser) {
        redirect('/super-admin/schools?error=no-admin');
    }

    const impersonateUrl = `/school-admin?impersonate=${encodeURIComponent(JSON.stringify(adminUser))}`;
    redirect(impersonateUrl);
}
