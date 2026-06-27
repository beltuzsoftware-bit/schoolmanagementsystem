const fs = require('fs');
const lines = fs.readFileSync('src/app/actions.ts', 'utf-8').split('\n');

let addSchoolStart = -1;
let addSchoolEnd = -1;
let updateSchoolStart = -1;
let updateSchoolEnd = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export async function addSchool')) {
        addSchoolStart = i + 1;
    }
    if (addSchoolStart !== -1 && i + 1 > addSchoolStart && addSchoolEnd === -1 && lines[i].trim() === '}') {
        addSchoolEnd = i + 1;
    }
    if (lines[i].includes('export async function updateSchool(')) {
        updateSchoolStart = i + 1;
    }
    if (updateSchoolStart !== -1 && i + 1 > updateSchoolStart && updateSchoolEnd === -1 && lines[i].trim() === '}') {
        updateSchoolEnd = i + 1;
    }
}

console.log(`addSchool: lines ${addSchoolStart} to ${addSchoolEnd}`);
console.log(`updateSchool: lines ${updateSchoolStart} to ${updateSchoolEnd}`);
