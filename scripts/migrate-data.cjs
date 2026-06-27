const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting Ultra-Level Migration (CJS Mode)...');

  const dataPath = path.join(process.cwd(), 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ data.json not found!');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const db = JSON.parse(rawData);

  console.log(`📊 Found ${db.schools?.length || 0} Schools`);
  console.log(`📊 Found ${db.users?.length || 0} Users`);
  console.log(`📊 Found ${db.students?.length || 0} Students`);

  // 1. Migrate Schools
  console.log('🏫 Migrating Schools...');
  for (const school of db.schools || []) {
    await prisma.school.upsert({
      where: { schoolId: school.schoolId },
      update: {},
      create: {
        id: school.id,
        name: school.name,
        schoolId: school.schoolId,
        code: school.code || '',
        address: school.address || '',
        contactNumber: school.contactNumber || '',
        email: school.email || '',
        logo: school.logo,
        packageId: school.packageId || 'free',
        isActive: true,
        currentSession: school.currentSession,
        useCustomDisableReasons: school.useCustomDisableReasons || false,
        disableReasons: school.disableReasons || [],
      },
    });


    // 1.1 Migrate Sessions for this school
    console.log(`📅 Migrating Sessions for ${school.name}...`);
    const dbSchool = await prisma.school.findUnique({ where: { schoolId: school.schoolId } });
    if (dbSchool) {
        for (const session of school.sessions || []) {
            const existingSession = await prisma.session.findFirst({
                where: { schoolId: dbSchool.id, name: session.name }
            });
            if (!existingSession) {
                await prisma.session.create({
                    data: {
                        name: session.name,
                        schoolId: dbSchool.id,
                        isCurrent: school.currentSession === session.name,
                        isActive: true,
                        status: 'Active'
                    }
                });
            }
        }
    }
  }


  // 2. Migrate Users
  console.log('👥 Migrating Users...');
  for (const user of db.users || []) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role || 'STAFF',
        schoolId: user.schoolId,
        avatar: user.avatar,
      },
    });
  }

  // 3. Populate Session Mapping
  console.log('🔗 Mapping Sessions...');
  const allSessions = await prisma.session.findMany();
  const sessionMap = {}; // schoolId_sessionName -> sessionId
  allSessions.forEach(s => {
    sessionMap[`${s.schoolId}_${s.name}`] = s.id;
  });

  // 4. Migrate Students (Batch Processing)
  console.log('🎓 Migrating Students (Batch Mode)...');
  const batchSize = 100;
  const students = db.students || [];
  
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    
    await Promise.all(batch.map(student => {
      const sessionId = sessionMap[`${student.schoolId}_${student.enrolledSession}`];
      
      return prisma.student.upsert({
        where: {
          schoolId_admissionNumber: {
            schoolId: student.schoolId,
            admissionNumber: student.admissionNumber
          }
        },
        update: {
          currentSessionId: sessionId || undefined
        },
        create: {
          id: student.id,
          schoolId: student.schoolId,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          name: student.name,
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          className: student.className,
          section: student.section,
          phone: student.phone,
          dob: student.dob,
          gender: student.gender,
          photo: student.photo,
          status: student.status || 'Active',
          loginPassword: student.loginPassword,
          studentUsername: student.studentUsername,
          parentUsername: student.parentUsername,
          parentPasswordChanged: student.parentPasswordChanged || false,
          currentSessionId: sessionId || undefined,
          enrolledSession: student.enrolledSession
        }
      });
    }));
    
    console.log(`✅ Processed ${Math.min(i + batchSize, students.length)} / ${students.length}`);
  }

  console.log('🎉 Migration Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
