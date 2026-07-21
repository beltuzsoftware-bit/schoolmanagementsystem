const { getAdmissionFormConfigForSchool } = require('../src/app/actions');
async function run() {
  const res = await getAdmissionFormConfigForSchool('s_1782211560310');
  console.log("Config keys:", Object.keys(res));
  console.log("apaarId config field:", res.config.find(f => f.fieldName === 'apaarId'));
  console.log("apaarId idSettings:", res.idSettings.apaarId);
}
run();
