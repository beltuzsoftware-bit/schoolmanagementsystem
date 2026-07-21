const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\3e49f5fd-3134-450b-837f-3471dd4a28cd\\.system_generated\\logs\\transcript.jsonl', 'utf8').trim().split('\n');
const obj = JSON.parse(lines[491]);
console.log("Full subagent response:", obj.content);
