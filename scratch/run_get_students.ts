require('dotenv').config();

async function main() {
  const { getStudents } = await import('../src/app/actions');
  const result = await getStudents('s_1780425419909');
  console.log("getStudents returned:", result.length);
  for (const s of result) {
    console.log(`Name: ${s.name}`);
    console.log(`  Class: ${s.className}-${s.section}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Photo present: ${!!s.photo}`);
    if (s.photo) {
      console.log(`  Photo length: ${s.photo.length}`);
      console.log(`  Photo prefix: ${s.photo.substring(0, 80)}...`);
    }
  }
}

main();
