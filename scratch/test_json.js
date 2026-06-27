const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('d:\\kummi-school-system\\data.json', 'utf8'));
  console.log('JSON parsed successfully!');
  console.log('School Name:', data.schools[0].name);
} catch (err) {
  console.error('JSON parse error:', err.message);
}
