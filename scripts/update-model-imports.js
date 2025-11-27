// scripts/update-model-imports.js
// This script automatically updates model imports to use the new index.ts barrel export

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Model import patterns to replace
const MODEL_PATTERNS = [
    {
        old: /import\s+Event(?:\s*,\s*\{\s*(?:type\s+)?IEvent(?:\s*,\s*(?:type\s+)?SerializedEvent)?\s*\})?\s+from\s+['"]@\/lib\/models\/Event['"]/g,
        getName: (match) => {
            const hasIEvent = match.includes('IEvent');
            const hasSerialized = match.includes('SerializedEvent');
            if (hasIEvent && hasSerialized) return 'Event, type IEvent, type SerializedEvent';
            if (hasIEvent) return 'Event, type IEvent';
            return 'Event';
        }
    },
    {
        old: /import\s+User(?:\s*,\s*\{\s*(?:type\s+)?IUser\s*\})?\s+from\s+['"]@\/lib\/models\/User['"]/g,
        getName: (match) => match.includes('IUser') ? 'User, type IUser' : 'User'
    },
    {
        old: /import\s+Notification(?:\s*,\s*\{\s*(?:type\s+)?INotification\s*\})?\s+from\s+['"]@\/lib\/models\/Notification['"]/g,
        getName: (match) => match.includes('INotification') ? 'Notification, type INotification' : 'Notification'
    },
    {
        old: /import\s+UserFavourite(?:\s*,\s*\{\s*(?:type\s+)?IUserFavourite\s*\})?\s+from\s+['"]@\/lib\/models\/UserFavourite['"]/g,
        getName: (match) => match.includes('IUserFavourite') ? 'UserFavourite, type IUserFavourite' : 'UserFavourite'
    },
    {
        old: /import\s+UserInteraction(?:\s*,\s*\{\s*(?:type\s+)?IUserInteraction\s*\})?\s+from\s+['"]@\/lib\/models\/UserInteraction['"]/g,
        getName: (match) => match.includes('IUserInteraction') ? 'UserInteraction, type IUserInteraction' : 'UserInteraction'
    },
];

// Separate type-only imports
const TYPE_PATTERNS = [
    {
        old: /import\s+(?:type\s+)?\{\s*(?:type\s+)?IEvent(?:\s*,\s*(?:type\s+)?SerializedEvent)?\s*\}\s+from\s+['"]@\/lib\/models\/Event['"]/g,
        getName: (match) => {
            const hasSerialized = match.includes('SerializedEvent');
            return hasSerialized ? 'type IEvent, type SerializedEvent' : 'type IEvent';
        }
    },
    {
        old: /import\s+(?:type\s+)?\{\s*(?:type\s+)?IUser\s*\}\s+from\s+['"]@\/lib\/models\/User['"]/g,
        getName: () => 'type IUser'
    },
    {
        old: /import\s+(?:type\s+)?\{\s*(?:type\s+)?INotification\s*\}\s+from\s+['"]@\/lib\/models\/Notification['"]/g,
        getName: () => 'type INotification'
    },
    {
        old: /import\s+(?:type\s+)?\{\s*(?:type\s+)?IUserFavourite\s*\}\s+from\s+['"]@\/lib\/models\/UserFavourite['"]/g,
        getName: () => 'type IUserFavourite'
    },
    {
        old: /import\s+(?:type\s+)?\{\s*(?:type\s+)?IUserInteraction\s*\}\s+from\s+['"]@\/lib\/models\/UserInteraction['"]/g,
        getName: () => 'type IUserInteraction'
    },
];

// Statistics
let stats = {
    filesScanned: 0,
    filesModified: 0,
    importsReplaced: 0,
    errors: 0,
};

/**
 * Check if directory should be excluded
 */
function shouldExclude(dirPath) {
    return EXCLUDE_DIRS.some(excluded => dirPath.includes(excluded));
}

/**
 * Check if file should be processed
 */
function shouldProcess(filePath) {
    return FILE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

/**
 * Process a single file
 */
function processFile(filePath) {
    try {
        stats.filesScanned++;

        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let replacements = [];

        // Track all imports found in this file
        const foundImports = new Set();

        // First pass: Find all model imports
        [...MODEL_PATTERNS, ...TYPE_PATTERNS].forEach(pattern => {
            const matches = content.match(pattern.old);
            if (matches) {
                matches.forEach(match => {
                    foundImports.add(pattern.getName(match));
                });
            }
        });

        // Second pass: Remove old imports
        [...MODEL_PATTERNS, ...TYPE_PATTERNS].forEach(pattern => {
            if (pattern.old.test(content)) {
                content = content.replace(pattern.old, '');
                modified = true;
            }
        });

        // Third pass: Add consolidated import at the top
        if (foundImports.size > 0) {
            const consolidatedImport = `import { ${Array.from(foundImports).join(', ')} } from '@/lib/models';\n`;

            // Find the position to insert (after other imports)
            const importLines = content.split('\n');
            let lastImportIndex = -1;

            for (let i = 0; i < importLines.length; i++) {
                if (importLines[i].trim().startsWith('import ')) {
                    lastImportIndex = i;
                }
            }

            if (lastImportIndex >= 0) {
                importLines.splice(lastImportIndex + 1, 0, consolidatedImport);
                content = importLines.join('\n');
            } else {
                // No imports found, add at the top
                content = consolidatedImport + '\n' + content;
            }

            // Clean up multiple blank lines
            content = content.replace(/\n\n\n+/g, '\n\n');

            replacements.push(`Consolidated ${foundImports.size} imports`);
        }

        // Save if modified
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            stats.filesModified++;
            stats.importsReplaced += foundImports.size;

            const relativePath = path.relative(SRC_DIR, filePath);
            console.log(`✅ ${relativePath}`);
            replacements.forEach(r => console.log(`   ${r}`));
        }

    } catch (error) {
        stats.errors++;
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
    if (shouldExclude(dirPath)) {
        return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.isFile() && shouldProcess(fullPath)) {
            processFile(fullPath);
        }
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🚀 Starting model import migration...\n');
    console.log(`Scanning directory: ${SRC_DIR}\n`);

    const startTime = Date.now();

    processDirectory(SRC_DIR);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Files scanned:     ${stats.filesScanned}`);
    console.log(`Files modified:    ${stats.filesModified}`);
    console.log(`Imports replaced:  ${stats.importsReplaced}`);
    console.log(`Errors:            ${stats.errors}`);
    console.log(`Duration:          ${duration}s`);
    console.log('='.repeat(50));

    if (stats.errors > 0) {
        console.log('\n⚠️  Some errors occurred. Please review the output above.');
        process.exit(1);
    } else {
        console.log('\n✅ Migration completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Review the changes with: git diff');
        console.log('   2. Test your application');
        console.log('   3. Commit the changes');
    }
}

// Run the script
main();