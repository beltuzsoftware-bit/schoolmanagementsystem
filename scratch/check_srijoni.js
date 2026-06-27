const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const students = data.students || [];
const srijoni = students.find(s => s.name.toLowerCase().includes('srijoni') || (s.firstName && s.firstName.toLowerCase() === 'srijoni'));

if (srijoni) {
    console.log("=== SRIJONI FOUND ===");
    console.log("ID:", srijoni.id);
    console.log("Name:", srijoni.name);
    console.log("Admission No:", srijoni.admissionNumber);
    console.log("Student Username:", srijoni.studentUsername);
    console.log("Login Password:", srijoni.loginPassword);
    console.log("DOB:", srijoni.dob);
} else {
    console.log("Srijoni not found in data.json");
}
