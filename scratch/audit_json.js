const fs = require('fs');
const path = 'd:/kummi-school-system/data.json';

try {
    const data = fs.readFileSync(path, 'utf-8');
    let stack = [];
    let inString = false;
    let escaped = false;
    let line = 1;
    let col = 1;

    for (let i = 0; i < data.length; i++) {
        const char = data[i];

        if (char === '\n') {
            line++;
            col = 1;
        } else {
            col++;
        }

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === '{') {
            stack.push({ type: 'OBJECT {', line, col });
        } else if (char === '[') {
            stack.push({ type: 'ARRAY [', line, col });
        } else if (char === '}') {
            if (stack.length === 0 || stack[stack.length - 1].type !== 'OBJECT {') {
                console.log(`EXTRA CLOSING BRACE at line ${line}, col ${col}. Current Stack:`, stack.map(s => s.type).join(' > '));
            }
            stack.pop();
        } else if (char === ']') {
            if (stack.length === 2 && stack[1].type === 'ARRAY [') {
                console.log(`POENTIAL ACCIDENTAL CLOSURE at line ${line}, col ${col}. This closed the Level 2 array.`);
            }
            if (stack.length === 0 || stack[stack.length - 1].type !== 'ARRAY [') {
                console.log(`EXTRA CLOSING BRACKET at line ${line}, col ${col}. Current Stack:`, stack.map(s => s.type).join(' > '));
            }
            stack.pop();
        }
    }

    if (stack.length === 0) {
        console.log('SUCCESS: JSON structure is balanced.');
    } else {
        console.log('UNBALANCED STRUCTURE FOUND:');
        stack.forEach(s => {
            console.log(`- Unclosed ${s.type} starting at line ${s.line}, col ${s.col}`);
        });
    }
} catch (err) {
    console.error('Error reading file:', err.message);
}
