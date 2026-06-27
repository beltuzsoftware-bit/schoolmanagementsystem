const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../data.json');

const db = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Setup user login account for Nausad if not exists
const hasUser = db.users.some(u => u.id === 'u_nausad' || u.email === '654789');
if (!hasUser) {
    db.users.push({
        id: 'u_nausad',
        name: 'Nausad',
        email: '654789',
        password: 'password123',
        role: 'STAFF',
        schoolId: 's_1779079515458',
        avatar: null,
        designation: 'Driver',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    console.log("Added User login account for Nausad!");
} else {
    console.log("User login account for Nausad already exists.");
}

// 2. Locate Nausad in transportDrivers and ensure details match
const driver = db.transportDrivers.find(d => d.phone === '654789');
if (driver) {
    console.log("Driver record Nausad found:", driver);
} else {
    console.log("Driver record Nausad NOT found!");
}

fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf8');
console.log("Setup complete!");
