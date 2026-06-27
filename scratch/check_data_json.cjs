const fs = require('fs');

try {
  const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  console.log("Schools in data.json:", db.schools?.map(s => ({ id: s.id, name: s.name, address: s.address })));
} catch (e) {
  console.error("Error reading data.json:", e);
}
