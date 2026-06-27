const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function syncAllData() {
  console.log('🔄 Starting Comprehensive Sync from data.json to Prisma...');

  const dataPath = path.join(process.cwd(), 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ data.json not found!');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const db = JSON.parse(rawData);

  // 1. Sync Global Student Defaults
  console.log('🌍 Syncing Global Student Defaults...');
  if (db.globalStudentDefaults) {
    // Filter fields to match Prisma model
    const { 
        sessions, 
        currentSession, 
        ...validDefaults 
    } = db.globalStudentDefaults;

    await prisma.globalStudentDefaults.upsert({
      where: { id: 'global-singleton' },
      create: {
        id: 'global-singleton',
        ...validDefaults
      },
      update: validDefaults
    });
    console.log('✅ Global defaults synced.');
  }

  // 2. Sync Student Profile Templates
  console.log('🎨 Syncing Student Profile Templates...');
  if (db.studentProfileTemplates) {
    for (const tmpl of db.studentProfileTemplates) {
      await prisma.studentProfileTemplate.upsert({
        where: { id: tmpl.id },
        create: {
          id: tmpl.id,
          name: tmpl.name,
          thumbnail: tmpl.thumbnail,
          config: tmpl.config,
          isSystem: !!tmpl.isDefault,
          createdAt: tmpl.createdAt ? new Date(tmpl.createdAt) : new Date(),
        },
        update: {
          name: tmpl.name,
          thumbnail: tmpl.thumbnail,
          config: tmpl.config,
          isSystem: !!tmpl.isDefault,
        }
      });
    }
    console.log(`✅ ${db.studentProfileTemplates.length} profile templates synced.`);
  }

  // 3. Sync Admission Form Templates
  console.log('📝 Syncing Admission Form Templates...');
  if (db.admissionFormTemplates) {
    for (const tmpl of db.admissionFormTemplates) {
      await prisma.admissionFormTemplate.upsert({
        where: { id: tmpl.id },
        create: {
          id: tmpl.id,
          name: tmpl.name,
          thumbnail: tmpl.thumbnail,
          config: tmpl.config,
          isSystem: !!tmpl.isDefault,
          createdAt: tmpl.createdAt ? new Date(tmpl.createdAt) : new Date(),
        },
        update: {
          name: tmpl.name,
          thumbnail: tmpl.thumbnail,
          config: tmpl.config,
          isSystem: !!tmpl.isDefault,
        }
      });
    }
    console.log(`✅ ${db.admissionFormTemplates.length} admission templates synced.`);
  }

  // 4. Sync School Settings
  console.log('🏫 Syncing School Settings...');
  for (const school of db.schools || []) {
    console.log(`- ${school.name} (${school.schoolId})`);
    
    try {
      const dbSchool = await prisma.school.findUnique({
        where: { schoolId: school.schoolId }
      });

      if (!dbSchool) continue;

      await prisma.school.update({
        where: { id: dbSchool.id },
        data: {
            // Toggles
            useCustomClasses: !!school.useCustomClasses,
            useCustomSections: !!school.useCustomSections,
            useCustomHouses: !!school.useCustomHouses,
            useCustomReligions: !!school.useCustomReligions,
            useCustomCategories: !!school.useCustomCategories,
            useCustomStreams: !!school.useCustomStreams,
            useCustomIdSettings: !!school.useCustomIdSettings,
            useCustomDisableReasons: !!school.useCustomDisableReasons,

            // Config Data
            classes: school.classes || null,
            sections: school.sections || null,
            houses: school.houses || null,
            religions: school.religions || null,
            categories: school.categories || null,
            streams: school.streams || null,
            disableReasons: school.disableReasons || ["Parent Request", "Transfer", "Fees Pending", "Other"],
            sessionStartMonth: school.sessionStartMonth || 4,

            // ID Generation
            regNoSettings: school.regNoSettings || null,
            enrollNoSettings: school.enrollNoSettings || null,
            apaarIdSettings: school.apaarIdSettings || null,
            penNoSettings: school.penNoSettings || null,
            srNoSettings: school.srNoSettings || null,
            genRegNoSettings: school.genRegNoSettings || null,
            rollNoSettings: school.rollNoSettings || null,

            // Admission & Profile
            admissionFormTemplateId: school.admissionFormTemplateId || null,
            admissionFieldOverrides: school.admissionFieldOverrides || null,
            studentProfileTemplateId: school.studentProfileTemplateId || null,
            onlineAdmissionOpen: !!school.onlineAdmissionOpen,
            admissionPaymentEnabled: !!school.admissionPaymentEnabled,
            admissionFeeAmount: school.admissionFeeAmount || 0,
            requireAdmissionDocs: !!school.requireAdmissionDocs,

            // Simple Settings & Branding
            tagline: school.tagline || null,
            shortName: school.shortName || null,
            affiliation: school.affiliation || null,
            affiliationCode: school.affiliationCode || null,
            udise: school.udise || null,
            city: school.city || null,
            state: school.state || null,
            pincode: school.pincode || null,
            country: school.country || null,
            watermark: school.watermark || null,
            signature: school.signature || null,
            qrCode: school.qrCode || null,
            upiId: school.upiId || null,
            defaultPaymentMode: school.defaultPaymentMode || "Cash",
        }
      });
    } catch (err) {
      console.error(`❌ Error syncing school settings for ${school.name}:`, err.message);
    }
  }

  // 5. Sync Student Documents (Batch)
  console.log('📄 Syncing Student Documents...');
  const students = db.students || [];
  let docCount = 0;
  
  for (const student of students) {
    const dbStudent = await prisma.student.findUnique({
        where: { schoolId_admissionNumber: { schoolId: student.schoolId, admissionNumber: student.admissionNumber } }
    });
    
    if (!dbStudent) continue;

    // Clear existing docs to prevent duplicates on rerun
    await prisma.studentDocument.deleteMany({ where: { studentId: dbStudent.id } });

    // Misc Documents
    if (student.miscDocuments && student.miscDocuments.length > 0) {
        for (const doc of student.miscDocuments) {
            await prisma.studentDocument.create({
                data: {
                    studentId: dbStudent.id,
                    title: doc.title || 'Misc Document',
                    file: doc.file || '',
                    content: doc.content || null,
                    type: 'Misc'
                }
            });
            docCount++;
        }
    }

    // Official Documents (Aadhaar, Transfer Certificate, etc.)
    const officialFields = ['aadhaarFront', 'aadhaarBack', 'birthCertificate', 'categoryCertificate', 'transferCertificate', 'previousReportCard'];
    for (const field of officialFields) {
        if (student[field]) {
            await prisma.studentDocument.create({
                data: {
                    studentId: dbStudent.id,
                    title: field,
                    file: student[field],
                    content: student[`${field}Content`] || student[`${field}FileContent`] || null,
                    type: 'Official',
                    fieldName: field
                }
            });
            docCount++;
        }
    }
  }
  console.log(`✅ ${docCount} student documents synced.`);

  console.log('🎉 Full data synchronization completed successfully!');
}

syncAllData()
  .catch((e) => {
    console.error('❌ Sync script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
