import prisma from "@/lib/prisma";

export default async function SyncDataPage() {
  const schoolId = 's_1776494594378';

  async function fixSessions(formData?: FormData) {
    'use server';
    const students = await prisma.student.findMany({
      where: { schoolId }
    });
    
    let fixed = 0;
    for (const student of students) {
      // If it's not a UUID or CUID, try to resolve it
      if (student.currentSessionId && 
          !student.currentSessionId.match(/^[0-9a-f-]{36}$/) && 
          !student.currentSessionId.startsWith('c') &&
          !student.currentSessionId.startsWith('sess_')) {
        const session = await prisma.session.findFirst({
          where: { schoolId, name: student.currentSessionId }
        });
        if (session) {
          await prisma.student.update({
            where: { id: student.id },
            data: { currentSessionId: session.id }
          });
          fixed++;
        }
      }
    }
  }

  const totalStudents = await prisma.student.count({
    where: { schoolId }
  });

  const students = await prisma.student.findMany({
    where: { schoolId },
    take: 50,
    orderBy: { admissionNumber: 'desc' },
    select: {
      name: true,
      admissionNumber: true,
      className: true,
      section: true,
      house: true,
      classAppliedFor: true,
      currentSessionId: true
    }
  });

  const sessions = await prisma.session.findMany({ where: { schoolId } });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Data Sync Audit</h1>
      
      <div className="flex gap-4 mb-6">
        <form action={fixSessions}>
          <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded shadow hover:bg-orange-700">
            Fix Invalid Session IDs
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <p className="text-lg text-gray-600">School ID: <span className="font-mono text-blue-600">{schoolId}</span></p>
        <p className="text-4xl font-bold mt-2">Total Students: {totalStudents}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Academic Sessions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">ID (UUID)</th>
                <th className="p-3 border">Current?</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 border">{s.name}</td>
                  <td className="p-3 border font-mono text-xs">{s.id}</td>
                  <td className="p-3 border">{s.isCurrent ? '✅' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Students (latest 50)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Adm No</th>
                <th className="p-3 border">Class</th>
                <th className="p-3 border">Section</th>
                <th className="p-3 border">House</th>
                <th className="p-3 border">Applied For</th>
                <th className="p-3 border">Session ID</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 border">{s.name}</td>
                  <td className="p-3 border">{s.admissionNumber}</td>
                  <td className="p-3 border">{s.className}</td>
                  <td className="p-3 border">{s.section}</td>
                  <td className="p-3 border">{s.house || '-'}</td>
                  <td className="p-3 border">{s.classAppliedFor || '-'}</td>
                  <td className="p-3 border font-mono text-xs">{s.currentSessionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
