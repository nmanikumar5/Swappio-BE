import { runMigration } from '../src/services/migrationService.js';

const force = process.argv.includes('--force');

async function main() {
    console.log('Running migration/seed (CLI)');
    try {
        const res = await runMigration({ force });
        if (res.skipped) {
            console.log('Migration skipped:', res.reason);
        } else {
            console.log('Migration complete. Sample user:', res.sampleUser);
        }
    } catch (err) {
        console.error('Migration failed:', err);
        process.exitCode = 1;
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
