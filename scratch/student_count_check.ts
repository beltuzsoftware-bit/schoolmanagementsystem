import * as fs from 'fs';
import * as path from 'path';

function checkStudentCounts() {
  const dbPath = path.join(process.cwd(), 'data.json');
  
  if (!fs.existsSync(dbPath)) {
    console.error('data.json not found at', dbPath);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const students = data.students || [];
    
    console.log('Total Student Records in database:', students.length);
    
    const schools: Record<string, { total: number; active: number; inactive: number }> = {};
    
    students.forEach((s: any) => {
      const schoolId = s.schoolId || 'unknown';
      if (!schools[schoolId]) {
        schools[schoolId] = { total: 0, active: 0, inactive: 0 };
      }
      
      schools[schoolId].total++;
      if (s.status === 'Active') {
        schools[schoolId].active++;
      } else {
        schools[schoolId].inactive++;
      }
    });

    console.log('\nStudent Count Summary by School:');
    console.table(schools);
    
    console.log('\nDetailed School Data:');
    Object.keys(schools).forEach(id => {
        console.log(`School: ${id}`);
        const schoolStudents = students.filter((s:any) => (s.schoolId || 'unknown') === id);
        console.log(`  Names: ${schoolStudents.map((s:any) => s.name || s.firstName + ' ' + (s.lastName || '')).join(', ')}`);
    });

  } catch (error) {
    console.error('Error parsing data.json:', error);
  }
}

checkStudentCounts();
