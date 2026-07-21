const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\3e49f5fd-3134-450b-837f-3471dd4a28cd\\.system_generated\\logs\\transcript.jsonl', 'utf8').trim().split('\n');
console.log("Searching for subagent or browser tool responses...");
for (let i = 0; i < lines.length; i++) {
  const obj = JSON.parse(lines[i]);
  if (obj.tool_calls && JSON.stringify(obj.tool_calls).includes('browser_subagent')) {
    console.log(`Line ${i}: Call to browser_subagent:`, JSON.stringify(obj.tool_calls));
  }
  if (obj.content && obj.content.includes('browser_subagent') || obj.type?.includes('SUBAGENT') || obj.content?.includes('TEST-123') || obj.content?.includes('Report') || obj.content?.includes('Verified')) {
    console.log(`Line ${i} (Type: ${obj.type}):`, obj.content?.substring(0, 500));
  }
}
