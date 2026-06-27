
import fs from 'fs';
import path from 'path';

const DB_PATH = 'd:/kummi-school-system/data.json';
const JSI_ID = 's_1776494594378';
const HERITAGE_ID = 's_1777051111204';

function cleanup() {
  if (!fs.existsSync(DB_PATH)) return;
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

  // 1. Remove JSI school
  data.schools = data.schools.filter(s => s.id !== JSI_ID);

  // 2. Remove JSI users
  data.users = data.users.filter(u => u.schoolId !== JSI_ID);

  // 3. Remove JSI students
  data.students = data.students.filter(s => s.schoolId !== JSI_ID);

  // 4. Remove JSI fee transactions
  data.feeTransactions = data.feeTransactions.filter(t => t.schoolId !== JSI_ID);

  // 5. Remove JSI fee groups
  data.feeGroups = data.feeGroups.filter(g => g.schoolId !== JSI_ID);

  // 6. Ensure Heritage School exists in data.json
  const heritageExists = data.schools.some(s => s.id === HERITAGE_ID);
  if (!heritageExists) {
    data.schools.push({
      id: HERITAGE_ID,
      name: "Heritage Model School",
      schoolId: "HMS2019",
      code: "HMS",
      address: "Heritage Address",
      contactNumber: "1234567890",
      email: "heritage@school.com",
      packageId: "test",
      isActive: true,
      sessionStartMonth: 4
    });
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  console.log('Cleanup complete!');
}

cleanup();
