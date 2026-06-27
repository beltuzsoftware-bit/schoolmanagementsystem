import prisma from '@/lib/prisma';

export default async function CheckUsers() {
    try {
        const users = await prisma.user.findMany();
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Database Users</h1>
                <pre className="bg-slate-100 p-4 rounded">
                    {JSON.stringify(users, null, 2)}
                </pre>
            </div>
        );
    } catch (error: any) {
        return (
            <div className="p-8 text-red-600">
                <h1 className="text-2xl font-bold mb-4">Error Connecting to DB</h1>
                <p>{error.message}</p>
            </div>
        );
    }
}
