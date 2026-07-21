const { EXTRACTED_ADMISSION_FIELDS } = require('../src/lib/admission-form-constants');
const fieldsWithId = EXTRACTED_ADMISSION_FIELDS.filter(f => f.fieldName.toLowerCase().includes('id'));
console.log("Fields containing 'id':", fieldsWithId.map(f => f.fieldName));
