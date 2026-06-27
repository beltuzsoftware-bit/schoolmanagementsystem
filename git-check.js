const { execSync } = require('child_process');
const fs = require('fs');

try {
    const output = execSync('git log -n 5 --oneline').toString();
    console.log("GIT LOG:");
    console.log(output);
    
    // Try to get original file content from HEAD if it was committed previously
    // If not committed, maybe there's a backup?
} catch (e) {
    console.log("No git repo or error:", e.message);
}
