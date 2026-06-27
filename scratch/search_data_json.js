const fs = require('fs');

const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));

function searchObj(obj, path = '') {
  if (!obj) return;
  if (path.startsWith('.students')) return; // skip students
  if (typeof obj === 'string') {
    if (obj.toLowerCase().includes('annual') || obj.toLowerCase().includes('post mid') || obj.toLowerCase().includes('hms') || obj.toLowerCase().includes('sample student')) {
      console.log(`FOUND at ${path}: "${obj}"`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((val, idx) => searchObj(val, `${path}[${idx}]`));
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => searchObj(obj[key], `${path}.${key}`));
  }
}

searchObj(db);
