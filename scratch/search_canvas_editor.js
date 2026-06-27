const fs = require('fs');
const content = fs.readFileSync('src/components/super-admin/canvas-editor.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.map') || line.includes('key={') || line.includes('canvasElements')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
