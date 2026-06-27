const fs = require('fs');
const content = fs.readFileSync('data.json', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.toLowerCase().includes('xavier')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
