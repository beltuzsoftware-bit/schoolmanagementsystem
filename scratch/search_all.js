const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, query);
    } else if (stat.isFile() && /\.(tsx|ts|js|jsx|json)$/.test(file)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes(query.toLowerCase())) {
          console.log(`Found "${query}" in: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              console.log(`  L${idx + 1}: ${line.trim()}`);
            }
          });
        }
      } catch (err) {}
    }
  }
}

console.log("Searching for 'HMS':");
searchDir('d:\\kummi-school-system', 'HMS');
console.log("\nSearching for 'ANNUAL EXAM':");
searchDir('d:\\kummi-school-system', 'ANNUAL EXAM');
console.log("\nSearching for 'Post Mid':");
searchDir('d:\\kummi-school-system', 'Post Mid');
