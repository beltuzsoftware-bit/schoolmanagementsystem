const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    console.log('Current data.json:');
    console.log('- transportVehicles:', data.transportVehicles?.length || 0);
    console.log('- transportRoutes:', data.transportRoutes?.length || 0);
    console.log('- transportDrivers:', data.transportDrivers?.length || 0);
    console.log('- transportVehicleTypes:', data.transportVehicleTypes?.length || 0);

    const bakData = JSON.parse(fs.readFileSync('data.json.bak', 'utf8'));
    console.log('\ndata.json.bak:');
    console.log('- transportVehicles:', bakData.transportVehicles?.length || 0);
    console.log('- transportRoutes:', bakData.transportRoutes?.length || 0);
    console.log('- transportDrivers:', bakData.transportDrivers?.length || 0);
    console.log('- transportVehicleTypes:', bakData.transportVehicleTypes?.length || 0);
} catch (e) {
    console.error(e);
}
