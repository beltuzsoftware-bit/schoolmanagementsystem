const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
data.schools.forEach(s => {
    console.log(JSON.stringify({
        id: s.id,
        name: s.name,
        code: s.code,
        shortName: s.shortName,
        displayName: s.displayName,
        customName: s.customName,
        accessories: s.accessories ? 'exists' : 'null'
    }, null, 2));
});
