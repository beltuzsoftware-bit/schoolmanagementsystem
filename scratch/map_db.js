const fs = require('fs');
const readline = require('readline');

const outputPath = 'd:/kummi-school-system/scratch/map_result.txt';
fs.writeFileSync(outputPath, '--- Database Map ---\n');

async function mapDb() {
  const fileStream = fs.createReadStream('d:/kummi-school-system/data.json');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  const keys = ['schools', 'students', 'packages', 'sessions', 'staff', 'attendance', 'inventory'];
  
  for await (const line of rl) {
    lineCount++;
    keys.forEach(key => {
      if (line.includes(`"${key}": [`)) {
        fs.appendFileSync(outputPath, `Line ${lineCount}: Found ${key}\n`);
      }
    });

    if (line.trim() === '}' && lineCount < 38000 && lineCount > 100) {
      // fs.appendFileSync(outputPath, `Line ${lineCount}: Possible Root Object Closure\n`);
    }
  }
  fs.appendFileSync(outputPath, '--- End of Map ---\n');
  console.log('Mapping complete. See scratch/map_result.txt');
}

mapDb();
