import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

// Regex to match local imports without .js extension (handles both ./ and ../)
const importRegex = /from\s+['"]((?:\.\/?)+[^'\"]*?)(?<!\.js)['"];?/g;
const requireRegex = /require\(['"]((?:\.\/?)+[^'\"]*?)(?<!\.js)['"]\)/g;

function fixImportsInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;

        // Fix ES6 imports
        content = content.replace(importRegex, (match, importPath) => {
            // Avoid touching package imports
            if (!importPath.startsWith('.')) return match;
            return match.replace(importPath, `${importPath}.js`);
        });

        // Fix CommonJS requires
        content = content.replace(requireRegex, (match, importPath) => {
            if (!importPath.startsWith('.')) return match;
            return `require('${importPath}.js')`;
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    let count = 0;

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            count += walkDir(filePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            if (fixImportsInFile(filePath)) {
                count++;
            }
        }
    });

    return count;
}

console.log('🔧 Fixing imports to add .js extensions for ES modules...\n');
const fixedCount = walkDir(srcDir);
console.log(`\n✨ Fixed ${fixedCount} file(s)`);
