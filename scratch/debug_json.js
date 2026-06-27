const fs = require('fs');
const path = require('path');

const dbPath = path.resolve('d:/kummi-school-system/data.json');
const data = fs.readFileSync(dbPath, 'utf-8');

try {
    JSON.parse(data);
    console.log('SUCCESS: JSON is valid.');
} catch (e) {
    console.error('FAILURE: JSON is invalid.');
    console.error('Error message:', e.message);
    
    // Attempt to find the position from the error message if possible
    // V8 usually gives "at position XXX"
    const match = e.message.match(/at position (\d+)/);
    if (match) {
        const pos = parseInt(match[1], 10);
        console.error('Error at position:', pos);
        
        const start = Math.max(0, pos - 50);
        const end = Math.min(data.length, pos + 50);
        const snippet = data.substring(start, end);
        const failedChar = data[pos];
        
        console.error('Context (around error):');
        console.error(snippet);
        console.error(' '.repeat(Math.min(pos, 50)) + '^');
        console.error('Character at error position:', JSON.stringify(failedChar));
        
        // Show line number
        const linesBefore = data.substring(0, pos).split('\n');
        console.error('Line number:', linesBefore.length);
        console.error('Column number:', linesBefore[linesBefore.length - 1].length + 1);
    }
}
