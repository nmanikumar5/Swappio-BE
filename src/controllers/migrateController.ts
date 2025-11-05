import { Request, Response } from 'express';
import { runMigration } from '../services/migrationService.js';
import { config } from '../config/env.js';

export const migrateHandler = async (req: Request, res: Response) => {
    try {
        // Security: in production require a secret token
        const secret = req.get('x-migrate-secret') || req.query.secret;
        if (config.nodeEnv === 'production') {
            if (!secret || secret !== process.env.MIGRATE_SECRET) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
        }

        const force = req.query.force === '1' || req.query.force === 'true' || req.body?.force === true;
        const result = await runMigration({ force });

        if (result.skipped) {
            return res.json({ success: true, skipped: true, reason: result.reason });
        }

        return res.json({ success: true, sampleUser: result.sampleUser });
    } catch (err: any) {
        console.error('Migration endpoint error:', err);
        return res.status(500).json({ success: false, message: 'Migration failed', error: String(err) });
    }
};
