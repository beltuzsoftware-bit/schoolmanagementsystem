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
  console.log('🚀 Starting Admin User Repair Process...');

  // 1. Fetch all schools from the database
  const schools = await prisma.school.findMany();
  console.log(`📊 Found ${schools.length} schools in database.`);

  const dataPath = path.join(process.cwd(), 'data.json');
  let db = { schools: [], users: [], students: [] };
  if (fs.existsSync(dataPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Warning: Failed to parse data.json, starting clean');
    }
  }

  for (const school of schools) {
    console.log(`\n🏫 Checking school: "${school.name}" (${school.schoolId})`);

    // 2. Check if a SCHOOL_ADMIN user exists for this school
    let admin = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        role: 'SCHOOL_ADMIN'
      }
    });

    const defaultEmail = school.email || `admin_${school.schoolId.toLowerCase()}@kummi.com`;
    const defaultPassword = 'password123';

    if (admin) {
      console.log(`✅ Admin user already exists: ${admin.email} (Role: ${admin.role})`);
    } else {
      console.log(`⚠️ No admin found for "${school.name}". Creating one...`);
      admin = await prisma.user.upsert({
        where: { email: defaultEmail },
        update: {
          role: 'SCHOOL_ADMIN',
          schoolId: school.id,
          status: 'Active'
        },
        create: {
          name: `${school.name} Admin`,
          email: defaultEmail,
          password: defaultPassword,
          role: 'SCHOOL_ADMIN',
          schoolId: school.id,
          status: 'Active',
          avatar: '/logo_placeholder.png'
        }
      });
      console.log(`🎉 Successfully created admin user: ${admin.email} with password: ${defaultPassword}`);
    }

    // 3. Keep local data.json in sync
    // Ensure school exists in data.json
    let localSchoolIdx = db.schools.findIndex(s => s.id === school.id || s.schoolId === school.schoolId);
    const localSchoolData = {
      id: school.id,
      name: school.name,
      schoolId: school.schoolId,
      code: school.code,
      address: school.address,
      contactNumber: school.contactNumber,
      email: school.email,
      logo: school.logo,
      packageId: school.packageId,
      maxStudents: school.maxStudents,
      isActive: school.isActive,
      currentSession: school.currentSession,
      admins: [admin.email]
    };

    if (localSchoolIdx >= 0) {
      db.schools[localSchoolIdx] = { ...db.schools[localSchoolIdx], ...localSchoolData };
    } else {
      db.schools.push(localSchoolData);
    }

    // Ensure user exists in data.json
    let localUserIdx = db.users.findIndex(u => u.email === admin.email);
    const localUserData = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      password: admin.password || defaultPassword,
      role: admin.role,
      schoolId: admin.schoolId,
      avatar: admin.avatar || '/logo_placeholder.png'
    };

    if (localUserIdx >= 0) {
      db.users[localUserIdx] = { ...db.users[localUserIdx], ...localUserData };
    } else {
      db.users.push(localUserData);
    }
  }

  // Save the updated data.json
  fs.writeFileSync(dataPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('\n💾 Successfully synchronized data.json with the repaired admin accounts.');
  console.log('🎉 Repair Process Finished Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Repair Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
