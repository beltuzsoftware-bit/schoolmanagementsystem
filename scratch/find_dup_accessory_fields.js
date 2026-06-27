const fs = require('fs');
const lines = fs.readFileSync('src/app/actions.ts', 'utf-8').split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const DEFAULT_ACCESSORY_FIELDS = [')) {
        count++;
        console.log(`Found declaration #${count} at line ${i + 1}`);
    }
}
