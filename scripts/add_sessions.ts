import prisma from '../src/lib/prisma'

async function addSessions() {
  const schoolId = 's_1776494594378' // Your school ID
  
  // Add sessions
  const sessions = [
    { name: '2024-2025', startDate: '2024-04-01', endDate: '2025-03-31', isCurrent: false, status: 'Completed' },
    { name: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', isCurrent: false, status: 'Completed' },
    { name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31', isCurrent: true, status: 'Active' }
  ]

  for (const s of sessions) {
    const created = await prisma.session.create({
      data: { ...s, schoolId }
    })
    console.log('Created session:', created.name)
  }

  // Update school current session
  await prisma.school.update({
    where: { id: schoolId },
    data: { currentSession: '2026-2027' }
  })

  console.log('Sessions added successfully!')
}

addSessions()
  .catch(console.error)
  .finally(() => prisma.disconnect())