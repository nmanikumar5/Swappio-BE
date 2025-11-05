import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { mapboxAutocomplete } from '../controllers/mapboxController';

const router = express.Router();

const mapboxLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: Math.max(10, Math.floor(config.rateLimit.maxRequests / 4)), // stricter for geocoding
    message: 'Too many Mapbox requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/autocomplete', mapboxLimiter, mapboxAutocomplete);

export default router;
