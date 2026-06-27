const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("🚀 Starting Option B Restore Process (Node.js)...");

// 1. Backup current data.json for safety
if (fs.existsSync('data.json')) {
    console.log("📦 Creating safety backup of current data.json...");
    fs.copyFileSync('data.json', 'data.json.before_restore_2026-05-20.json');
}

// 2. Resolve backup directory from command line arguments
const backupDirName = process.argv[2];
if (!backupDirName) {
    console.error("❌ Error: Please specify the backup folder name as an argument.");
    console.error("   Example: node execute_restore.js KuMMi_Portable_Backup_2026-06-02_1241");
    process.exit(1);
}

const backupPath = path.resolve(process.cwd(), backupDirName);
if (!fs.existsSync(backupPath)) {
    console.error(`❌ Error: Backup directory '${backupDirName}' does not exist at path: ${backupPath}`);
    process.exit(1);
}

console.log(`📂 Copying files from ${backupDirName}...`);

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    fs.readdirSync(from).forEach(element => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isDirectory()) {
            if (element === 'node_modules' || element === '.next' || element === '.git' || element === 'backups' || element === 'brain') return;
            copyFolderSync(fromPath, toPath);
        } else {
            fs.copyFileSync(fromPath, toPath);
        }
    });
}

try {
    copyFolderSync(backupPath, '.');
    console.log("📂 Files copied successfully.");
} catch (err) {
    console.error("❌ Error copying files:", err);
    process.exit(1);
}

// 3. Sync restored data into the database
console.log("🔄 Syncing restored data.json to Postgres database...");
try {
    execSync('node scripts/migrate-data.cjs', { stdio: 'inherit' });
    console.log("✅ Restore complete! Please restart your dev server (npm run dev).");
} catch (err) {
    console.error("❌ Error running migrate-data.cjs:", err.message);
    process.exit(1);
}
