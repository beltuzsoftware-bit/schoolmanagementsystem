const fs = require('fs');

function uppercaseVehicles(filename) {
  if (fs.existsSync(filename)) {
    try {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      let updated = false;

      if (data.transportVehicles) {
        data.transportVehicles.forEach(vh => {
          if (vh.vehicleNumber && vh.vehicleNumber !== vh.vehicleNumber.toUpperCase()) {
            console.log(`Updating vehicle number "${vh.vehicleNumber}" to "${vh.vehicleNumber.toUpperCase()}" in ${filename}`);
            vh.vehicleNumber = vh.vehicleNumber.toUpperCase();
            updated = true;
          }
        });
      }

      if (updated) {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Successfully updated ${filename}`);
      } else {
        console.log(`No lowercase vehicle numbers found in ${filename}`);
      }
    } catch (err) {
      console.error(`Error processing ${filename}:`, err);
    }
  } else {
    console.log(`${filename} does not exist.`);
  }
}

uppercaseVehicles('data.json');
uppercaseVehicles('data.json.bak');
