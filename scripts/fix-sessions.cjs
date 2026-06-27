const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixSessions() {
  console.log('🔍 Checking school and session state...\n');

  const schools = await prisma.school.findMany({ include: { sessions: true } });

  for (const school of schools) {
    console.log(`🏫 School: ${school.name} (${school.schoolId})`);
    console.log(`   DB currentSession field: "${school.currentSession}"`);
    console.log(`   Sessions in DB:`);
    school.sessions.forEach(s => {
      console.log(`     - "${s.name}" | id: ${s.id} | isCurrent: ${s.isCurrent}`);
    });

    // Fix school.currentSession: only update if it's pointing to a non-existent session name
    const currentSession = school.sessions.find(s => s.isCurrent);
    if (currentSession && school.currentSession !== currentSession.name) {
      await prisma.school.update({
        where: { id: school.id },
        data: { currentSession: currentSession.name }
      });
      console.log(`\n   ✅ Fixed school.currentSession: "${school.currentSession}" → "${currentSession.name}"`);
    } else {
      console.log(`\n   ✅ school.currentSession is correct: "${school.currentSession}"`);
    }

    // Build a name→id map for sessions belonging to this school
    const sessionNameToId = {};
    school.sessions.forEach(s => { sessionNameToId[s.name] = s.id; });

    // Find students whose currentSessionId is a known session NAME (not a CUID/UUID)
    const students = await prisma.student.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, currentSessionId: true }
    });

    const toFix = students.filter(s => {
      const id = s.currentSessionId || '';
      const isCuid = /^c[a-z0-9]{20,}/i.test(id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isCuid || isUuid) return false; // Already a real ID — skip
      return sessionNameToId[id] !== undefined; // Only fix if we can resolve the name
    });

    const cannotFix = students.filter(s => {
      const id = s.currentSessionId || '';
      const isCuid = /^c[a-z0-9]{20,}/i.test(id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      return !isCuid && !isUuid && sessionNameToId[id] === undefined;
    });

    if (toFix.length === 0 && cannotFix.length === 0) {
      console.log(`   ✅ All ${students.length} students have correct session IDs.\n`);
      continue;
    }

    if (cannotFix.length > 0) {
      console.log(`\n   ⚠️  ${cannotFix.length} students have an unrecognised session value and will NOT be changed:`);
      cannotFix.forEach(s => console.log(`     - ${s.name}: "${s.currentSessionId}"`));
    }

    if (toFix.length > 0) {
      console.log(`\n   🔧 Fixing ${toFix.length} students whose session name maps to a real session...`);
      for (const student of toFix) {
        const realId = sessionNameToId[student.currentSessionId];
        await prisma.student.update({
          where: { id: student.id },
          data: { currentSessionId: realId }
        });
        console.log(`     ✅ ${student.name}: "${student.currentSessionId}" → "${realId}"`);
      }
    }

    console.log();
  }

  console.log('🎉 Session fix complete!');
}

fixSessions()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
