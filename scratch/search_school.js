const fs = require('fs');
const content = fs.readFileSync('data.json', 'utf-8');
let pos = 0;
while (true) {
    const idx = content.indexOf('s_1780586158265', pos);
    if (idx === -1) break;
    console.log('Found occurrence at index:', idx);
    console.log(content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 150)));
    console.log('--------------------');
    pos = idx + 1;
}
