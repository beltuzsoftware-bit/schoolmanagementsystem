const fs = require('fs');

const INPUT_PATH = 'd:/kummi-school-system/data.json';
const OUTPUT_PATH = 'd:/kummi-school-system/scratch/repaired.json';

const content = fs.readFileSync(INPUT_PATH, 'utf-8');

function extractBlock(key, openChar, closeChar) {
    console.log(`Searching for "${key}"...`);
    const searchStr = `"${key}": ${openChar}`;
    let startIndex = -1;
    let candidates = [];

    let currentPos = 0;
    while ((startIndex = content.indexOf(searchStr, currentPos)) !== -1) {
        let depth = 1;
        let inString = false;
        let escaped = false;
        let p = startIndex + searchStr.length;

        for (; p < content.length; p++) {
            const char = content[p];
            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (inString) continue;

            if (char === openChar) depth++;
            if (char === closeChar) depth--;

            if (depth === 0) {
                const block = content.substring(startIndex + searchStr.length - 1, p + 1);
                candidates.push(block);
                break;
            }
        }
        currentPos = startIndex + searchStr.length;
    }

    if (candidates.length === 0) return openChar === '[' ? '[]' : '{}';
    // Return the longest candidate (most likely the full data block)
    return candidates.sort((a, b) => b.length - a.length)[0];
}

try {
    const schools = extractBlock('schools', '[', ']');
    const students = extractBlock('students', '[', ']');
    const packages = extractBlock('packages', '[', ']');
    const sessions = extractBlock('sessions', '[', ']');
    const attendance = extractBlock('attendance', '[', ']');
    const staff = extractBlock('staff', '[', ']');
    const inventory = extractBlock('inventory', '[', ']');

    const repairedJson = `{
  "schools": ${schools},
  "students": ${students},
  "packages": ${packages},
  "sessions": ${sessions},
  "attendance": ${attendance},
  "staff": ${staff},
  "inventory": ${inventory}
}`;

    console.log('Validating repaired JSON structure...');
    JSON.parse(repairedJson);
    
    fs.writeFileSync(OUTPUT_PATH, repairedJson);
    console.log('SUCCESS: Repaired database written to ' + OUTPUT_PATH);
} catch (err) {
    console.error('REPAIR FAILED:', err.message);
}
