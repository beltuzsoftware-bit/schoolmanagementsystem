const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\3e49f5fd-3134-450b-837f-3471dd4a28cd\\.system_generated\\logs\\transcript.jsonl', 'utf8').trim().split('\n');
console.log("Last 5 lines of transcript:");
for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
  const obj = JSON.parse(lines[i]);
  console.log(`--- Line ${i} (Type: ${obj.type}, Source: ${obj.source}) ---`);
  console.log(JSON.stringify(obj, null, 2).substring(0, 1000));
}
