const fs = require('fs');
const content = fs.readFileSync('src/app/actions.ts', 'utf-8');
const index = content.indexOf('addSchool');
if (index !== -1) {
    console.log('Found addSchool at index:', index);
    console.log(content.substring(index - 100, index + 200));
} else {
    console.log('addSchool NOT found in src/app/actions.ts');
}
const index2 = content.indexOf('getSchools');
if (index2 !== -1) {
    console.log('Found getSchools at index:', index2);
    console.log(content.substring(index2 - 100, index2 + 200));
} else {
    console.log('getSchools NOT found in src/app/actions.ts');
}
