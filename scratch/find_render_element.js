const fs = require('fs');
const content = fs.readFileSync('src/components/super-admin/canvas-editor.tsx', 'utf8');
const lines = content.split('\n');
let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('function renderElement') || line.includes('const renderElement')) {
    start = idx;
  }
});
if (start !== -1) {
  console.log(`Found renderElement around line ${start + 1}`);
  for (let i = start; i < start + 150; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('Not found');
}
