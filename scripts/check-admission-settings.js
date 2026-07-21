const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
console.log("admissionSettings keys:", db.admissionSettings?.[0] ? Object.keys(db.admissionSettings[0]) : 'None');
console.log("admissionSettings items:", db.admissionSettings?.length);
const schoolAdmSetting = db.admissionSettings?.find(s => s.schoolId === 's_1782211560310');
console.log("schoolAdmSetting:", schoolAdmSetting);
