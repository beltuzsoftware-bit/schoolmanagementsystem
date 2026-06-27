const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:/kummi-school-system/data.json', 'utf8'));
console.log('Transport Drivers:', JSON.stringify(data.transportDrivers, null, 2));
console.log('Transport Vehicles:', JSON.stringify(data.transportVehicles, null, 2));
console.log('Transport Vehicle Types:', JSON.stringify(data.transportVehicleTypes, null, 2));
