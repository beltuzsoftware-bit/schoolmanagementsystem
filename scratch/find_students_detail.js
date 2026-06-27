const fs = require('fs');
const path = require('path');

const dbPath = 'd:/kummi-school-system/data.json';
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('Total students:', data.students?.length);
console.log('Total applications:', data.admissionApplications?.length);

const foundStudents = data.students?.filter(s => 
    s.name.toLowerCase().includes('kk das') || 
    s.name.toLowerCase().includes('pool')
);

console.log('Found Students:', JSON.stringify(foundStudents, null, 2));

const foundApps = data.admissionApplications?.filter(a => 
    (a.name && a.name.toLowerCase().includes('kk das')) || 
    (a.name && a.name.toLowerCase().includes('pool')) ||
    (a.firstName && a.firstName.toLowerCase().includes('kk das')) ||
    (a.firstName && a.firstName.toLowerCase().includes('pool'))
);

console.log('Found Applications:', JSON.stringify(foundApps, null, 2));

// Also check the schools current session
const school = data.schools?.find(s => s.name === 'JSI');
console.log('JSI School Current Session:', school?.currentSession);
console.log('JSI School Sessions:', JSON.stringify(school?.sessions, null, 2));
