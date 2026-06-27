const { readDb } = require('./src/lib/db');
console.log('globals:', readDb().globalStudentDefaults);
