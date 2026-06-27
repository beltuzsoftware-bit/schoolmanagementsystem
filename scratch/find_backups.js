const fs = require('fs');
const dirs = fs.readdirSync('.').filter(f => fs.statSync(f).isDirectory());
console.log('DIRECTORIES FOUND:');
dirs.forEach(d => {
    if (d.includes('24-01-2026') || d.includes('24-04-2026')) {
        console.log(`- ${d}`);
    }
});
const files = fs.readdirSync('.').filter(f => !fs.statSync(f).isDirectory());
console.log('\nFILES FOUND:');
files.forEach(f => {
    if (f.includes('24-01-2026') || f.includes('24-04-2026')) {
        console.log(`- ${f}`);
    }
});
