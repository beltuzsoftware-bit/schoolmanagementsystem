const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
console.log("Root keys:", Object.keys(db));
if (db.admissionFormConfigs) {
  console.log("admissionFormConfigs count:", db.admissionFormConfigs.length);
  console.log("First config keys:", Object.keys(db.admissionFormConfigs[0] || {}));
  console.log("First config idSettings:", db.admissionFormConfigs[0]?.idSettings);
}
