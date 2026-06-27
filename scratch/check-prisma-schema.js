import fs from 'fs';
import path from 'path';

const filePath = path.join('prisma', 'schema.prisma');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('--- LINE BY LINE INSPECTION ---');
lines.slice(0, 15).forEach((line, i) => {
    console.log(`${i + 1}: [${line}] (Length: ${line.length})`);
    console.log(`Hex: ${Buffer.from(line).toString('hex')}`);
});
