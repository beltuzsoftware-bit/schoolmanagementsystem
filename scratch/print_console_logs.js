import fs from 'fs';
import path from 'path';

const logPath = path.resolve('C:/Users/DELL/.gemini/antigravity-ide/brain/31441c99-12a7-4b56-a49d-2b80058e1838/.system_generated/logs/transcript.jsonl');
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

for (const line of lines) {
    if (!line) continue;
    try {
        const obj = JSON.parse(line);
        // Look for capture_browser_console_logs tool outputs in the transcript
        if (obj.tool_calls) {
            for (const tc of obj.tool_calls) {
                if (tc.name === 'capture_browser_console_logs') {
                    console.log('Found capture_browser_console_logs call arguments:', tc.arguments);
                }
            }
        }
        if (obj.content && obj.content.includes('RUNTIME FLATFEES')) {
            console.log('Found RUNTIME FLATFEES string in step content:', obj.content);
        }
    } catch (e) {
        // Ignore JSON parse errors for non-json lines
    }
}
