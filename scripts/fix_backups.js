const fs = require('fs');
const path = require('path');

const rootDir = 'd:/kummi-school-system';
const backupPrefix = 'kummi-school-system_24-';
const corruptedPrefix = 'data.json.corrupted';

// Get all files and folders in root
const items = fs.readdirSync(rootDir);

let cleanupCount = 0;
let errorCount = 0;

console.log('🚀 Starting deep cleanup of mistaken items...');

items.forEach(item => {
    // Target backup folders/files and corrupted data files
    if (item.startsWith(backupPrefix) || item.startsWith(corruptedPrefix)) {
        const itemPath = path.join(rootDir, item);
        try {
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                console.log(`🗑️ Deleting folder: ${item}`);
                fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
                console.log(`📄 Deleting file: ${item}`);
                fs.unlinkSync(itemPath);
            }
            cleanupCount++;
        } catch (err) {
            console.error(`❌ Failed to delete ${item}: ${err.message}`);
            errorCount++;
        }
    }
});

console.log(`\n✅ Cleanup complete.`);
console.log(`Successfully removed: ${cleanupCount} items.`);
if (errorCount > 0) {
    console.log(`Failed to remove: ${errorCount} items (likely locked by another process).`);
}


