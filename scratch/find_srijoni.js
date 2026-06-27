const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:/kummi-school-system/data.json', 'utf8'));

console.log('Searching for "Srijoni" in students...');
const student = data.students?.find(s => 
    (s.name && s.name.toLowerCase().includes('sri')) || 
    (s.firstName && s.firstName.toLowerCase().includes('sri')) ||
    (s.studentUsername && s.studentUsername.toLowerCase() === 'srijoni')
);

if (student) {
    console.log('Found student:', JSON.stringify(student, null, 2));
} else {
    console.log('No student found with name containing "sri" or username "srijoni"');
    console.log('Total students:', data.students?.length);
    if (data.students && data.students.length > 0) {
        console.log('First few students:', data.students.slice(0, 5).map(s => s.name || s.firstName));
    }
}

console.log('\nSearching in users...');
const user = data.users?.find(u => u.name.toLowerCase().includes('sri') || u.email.toLowerCase().includes('sri'));
if (user) {
    console.log('Found user:', JSON.stringify(user, null, 2));
} else {
    console.log('No user found with name/email containing "sri"');
}
