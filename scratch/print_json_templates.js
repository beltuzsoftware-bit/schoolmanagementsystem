const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const templates = db.idCardTemplates || [];

for (const tmpl of templates) {
  console.log(`\n=== Template: ${tmpl.name} (${tmpl.layout}, ${tmpl.width}x${tmpl.height}mm) ===`);
  const elements = tmpl.canvasElements;
  if (!elements || !Array.isArray(elements)) {
    console.log('  No canvas elements');
    continue;
  }
  elements
    .sort((a, b) => a.y - b.y)
    .forEach(el => {
      console.log(`  [${el.type}] id=${el.id.slice(0,12)} | x=${el.x}% y=${el.y}% w=${el.width}% h=${el.height}% | fieldKey=${el.fieldKey || ''} | fieldLabel=${el.fieldLabel || ''} | labelText=${el.labelText || ''} | text=${el.text || ''}`);
    });
}
