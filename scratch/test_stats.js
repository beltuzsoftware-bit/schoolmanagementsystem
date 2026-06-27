const { readDb } = require('./src/lib/db');

async function testStats() {
    const db = readDb();
    const schools = db.schools || [];
    
    const totalSchools = schools.length;
    const totalStudents = schools.reduce((acc, s) => acc + (s.studentCount || 0), 0);
    
    // Revenue logic: Sum of package prices for each school
    const packages = db.packages || [];
    const totalRevenue = schools.reduce((acc, s) => {
        const pkg = packages.find(p => p.id === s.packageId);
        return acc + (pkg ? pkg.price : 0);
    }, 0);

    console.log({
        totalSchools,
        totalStudents,
        totalRevenue,
        recentSchools: schools.length
    });
}

testStats();
