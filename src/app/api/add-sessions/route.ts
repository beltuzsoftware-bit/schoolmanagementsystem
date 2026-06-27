import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const schoolId = 's_1776494594378' // Your school ID
    
    // Create sessions
    const sessions = [
      { name: '2024-2025', startDate: '2024-04-01', endDate: '2025-03-31', isCurrent: false, status: 'Completed' },
      { name: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', isCurrent: false, status: 'Completed' },
      { name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31', isCurrent: true, status: 'Active' }
    ]

    for (const s of sessions) {
      await prisma.session.create({
        data: { ...s, schoolId }
      })
    }

    // Update school
    await prisma.school.update({
      where: { id: schoolId },
      data: { currentSession: '2026-2027' }
    })

    return NextResponse.json({ success: true, message: 'Sessions added' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}