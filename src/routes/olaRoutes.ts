import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { olaAutocomplete } from '../controllers/olaController.js';
import { config } from '../config/env.js';

const router = Router();

// route-specific rate limiter (stricter than global if desired)
const olaLimiter = rateLimit({
    windowMs: Math.max(1000, config.rateLimit.windowMs / 10), // e.g., smaller window
    max: Math.max(5, Math.floor(config.rateLimit.maxRequests / 10)),
    message: 'Too many autocomplete requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Optional simple middleware to accept proxy token via header or query
const requireProxyTokenIfConfigured = (req: Request, res: Response, next: NextFunction) => {
    const proxyToken = config.ola.proxyToken;
    if (!proxyToken) return next();
    const bearer = req.header('authorization') || '';
    const tokenFromHeader = bearer.replace(/^Bearer\s+/i, '');
    const tokenFromHeader2 = req.header('x-ola-proxy-token') || '';
    const tokenFromQuery = (req.query.proxyToken as string) || '';
    if (tokenFromHeader === proxyToken || tokenFromHeader2 === proxyToken || tokenFromQuery === proxyToken) return next();
    return res.status(401).json({ error: 'Unauthorized' });
};

router.get('/autocomplete', olaLimiter, requireProxyTokenIfConfigured, olaAutocomplete);

export default router;
