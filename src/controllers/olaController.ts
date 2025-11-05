import { Request, Response } from 'express';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import { config } from '../config/env';

const cache = new NodeCache({ stdTTL: 30 });

// Helper: extract coords from different Ola response shapes
const extractCoords = (obj: any): { lat?: number; lng?: number } | null => {
    if (!obj) return null;
    // Ola features sometimes have geometry.coordinates [lng, lat]
    if (obj.geometry && Array.isArray(obj.geometry.coordinates)) {
        const [lng, lat] = obj.geometry.coordinates;
        if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
    }
    // other shapes: center, bbox, location, position
    if (obj.center && Array.isArray(obj.center)) {
        const [lng, lat] = obj.center;
        if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
    }
    if (obj.center_lat && obj.center_lng) {
        return { lat: Number(obj.center_lat), lng: Number(obj.center_lng) };
    }
    if (obj.location && obj.location.lat && obj.location.lon) {
        return { lat: Number(obj.location.lat), lng: Number(obj.location.lon) };
    }
    if (obj.lat && obj.lng) return { lat: Number(obj.lat), lng: Number(obj.lng) };
    if (obj.latitude && obj.longitude) return { lat: Number(obj.latitude), lng: Number(obj.longitude) };
    return null;
};

export const olaAutocomplete = async (req: Request, res: Response) => {
    try {
        const q = (req.query.q as string) || '';
        if (!q.trim()) return res.json({ predictions: [] });

        // Optional proxy token enforcement
        const proxyToken = config.ola.proxyToken;
        if (proxyToken) {
            const bearer = req.header('authorization') || req.header('Authorization') || '';
            const apiToken = req.header('x-ola-proxy-token') || req.query.proxyToken || '';
            const ok = bearer.replace(/^Bearer\s+/i, '') === proxyToken || apiToken === proxyToken;
            if (!ok) return res.status(401).json({ error: 'Unauthorized' });
        }

        const cacheKey = `ola:${q}:${req.header('x-ola-proxy-token') || ''}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const endpointBase = config.ola.autocompleteUrl;
        const apiKey = config.ola.apiKey;
        if (!endpointBase) return res.status(500).json({ error: 'Missing OLA_AUTOCOMPLETE_URL' });

        const params = new URLSearchParams({ input: q });
        console.log('Ola autocomplete request for', q, req.query);
        // pass through optional params from client (lang, limit, types) if provided
        if (req.query.lang) params.set('lang', String(req.query.lang));
        if (req.query.limit) params.set('limit', String(req.query.limit));
        if (req.query.types) params.set('types', String(req.query.types));
        if (apiKey) params.set('api_key', apiKey);

        const endpoint = `${endpointBase}?${params.toString()}`;

        const headers: Record<string, string> = {};
        if (req.header('X-Request-Id')) headers['X-Request-Id'] = req.header('X-Request-Id') as string;
        if (apiKey) {
            headers['X-Api-Key'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const upstream = await fetch(endpoint, { headers });
        const text = await upstream.text();
        // If upstream returned a non-2xx status, surface a clear error
        if (!upstream.ok) {
            console.error('Ola upstream returned non-2xx', upstream.status, text.slice(0, 800));
            return res.status(502).json({ error: 'Upstream error from Ola', status: upstream.status, preview: text.slice(0, 800) });
        }

        // Try to detect non-JSON responses (HTML pages) and return a helpful error
        const contentLooksLikeHtml = typeof text === 'string' && text.trim().startsWith('<');
        if (contentLooksLikeHtml) {
            console.error('Ola upstream returned HTML (likely wrong URL or auth). Preview:', text.slice(0, 800));
            return res.status(502).json({ error: 'Ola upstream returned non-JSON (HTML). Check OLA_AUTOCOMPLETE_URL and API key.', preview: text.slice(0, 800) });
        }

        let json: any;
        try { json = JSON.parse(text); } catch (e) {
            console.error('Failed to parse Ola upstream JSON', e, text.slice(0, 800));
            return res.status(502).json({ error: 'Invalid JSON from Ola upstream', preview: text.slice(0, 800) });
        }

        // normalize: try predictions, suggestions, features
        let preds: { id: string; description: string; coords?: { lat: number; lng: number } | null }[] = [];
        if (Array.isArray(json.predictions)) {
            preds = json.predictions.map((p: any) => {
                const coords = extractCoords(p) || extractCoords(p.place) || extractCoords(p.feature) || null;
                return {
                    id: p.place_id || p.id || String(Math.random()),
                    description: p.description || p.place_name || JSON.stringify(p),
                    coords,
                };
            });
        } else if (Array.isArray(json.suggestions)) {
            preds = json.suggestions.map((s: any) => {
                const coords = extractCoords(s) || null;
                return {
                    id: s.id || String(Math.random()),
                    description: s.display || s.name || JSON.stringify(s),
                    coords,
                };
            });
        } else if (Array.isArray(json.features)) {
            preds = json.features.map((f: any) => {
                const coords = extractCoords(f) || null;
                return {
                    id: f.id || String(Math.random()),
                    description: f.place_name || f.text || JSON.stringify(f),
                    coords,
                };
            });
        } else {
            preds = [];
        }

        const payload = { predictions: preds, raw: json };
        cache.set(cacheKey, payload);
        return res.json(payload);
    } catch (err) {
        console.error('Ola autocomplete error', err);
        return res.status(500).json({ error: 'Internal' });
    }
};
