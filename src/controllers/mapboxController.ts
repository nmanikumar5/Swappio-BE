import { Request, Response } from 'express';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import { config } from '../config/env';

const cache = new NodeCache({ stdTTL: 30 });

export const mapboxAutocomplete = async (req: Request, res: Response) => {
    try {
        const q = (req.query.q as string) || '';
        if (!q.trim()) return res.json({ predictions: [] });

        // optional proxy token enforcement
        const proxyToken = config.mapbox.proxyToken;
        if (proxyToken) {
            const bearer = req.header('authorization') || '';
            const apiToken = req.header('x-mapbox-proxy-token') || req.query.proxyToken || '';
            const ok = bearer.replace(/^Bearer\s+/i, '') === proxyToken || apiToken === proxyToken;
            if (!ok) return res.status(401).json({ error: 'Unauthorized' });
        }

        const cacheKey = `mapbox:${q}:${req.header('x-mapbox-proxy-token') || ''}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const endpointBase = config.mapbox.autocompleteUrl.replace(/\/$/, '');
        const token = config.mapbox.token;
        if (!token) return res.status(500).json({ error: 'Missing MAPBOX_TOKEN' });

        // Mapbox forward geocoding expects {endpoint}/{query}.json with query params
        const url = `${endpointBase}?q=${encodeURIComponent(q)}&access_token=${encodeURIComponent(
            token
        )}&session_token=${encodeURIComponent(String(req.query.session_token || ''))}&types=place,city`;
        const upstream = await fetch(url);
        const text = await upstream.text();
        if (!upstream.ok) {
            console.error('Mapbox upstream returned non-2xx', upstream.status, text.slice(0, 800));
            return res.status(502).json({ error: 'Upstream Mapbox error', status: upstream.status, preview: text.slice(0, 800) });
        }

        if (typeof text === 'string' && text.trim().startsWith('<')) {
            console.error('Mapbox upstream returned HTML', text.slice(0, 800));
            return res.status(502).json({ error: 'Non-JSON from Mapbox upstream', preview: text.slice(0, 800) });
        }

        let json: any;
        try { json = JSON.parse(text); } catch (e) {
            console.error('Failed to parse Mapbox JSON', e, text.slice(0, 800));
            return res.status(502).json({ error: 'Invalid JSON from Mapbox', preview: text.slice(0, 800) });
        }

        let preds: any[] = [];

        // Standard Mapbox: features array
        if (Array.isArray(json.features)) {
            preds = json.features.map((f: any) => ({
                id: f.id || String(Math.random()),
                description: f.place_name || f.text || '',
                coords: f.center && Array.isArray(f.center) ? { lng: f.center[0], lat: f.center[1] } : undefined,
                types: Array.isArray(f.place_type) ? f.place_type : undefined,
                raw: f,
            }));
        }

        // Alternate provider shape: suggestions array (mapbox_id, feature_type, place_formatted, context)
        else if (Array.isArray(json.suggestions)) {
            preds = json.suggestions.map((s: any) => ({
                id: s.mapbox_id || s.id || String(Math.random()),
                // description: `${s.name} ${s.place_formatted}`,
                name: `${s.name} ${s.place_formatted}`,
                // No direct coords in this shape; try to extract from s.geometry/center or fallback to undefined
                // coords: s.center && Array.isArray(s.center) ? { lng: s.center[0], lat: s.center[1] } : undefined,
                // Map the provider's feature_type to types array
                // types: s.feature_type ? [s.feature_type] : undefined,
                // raw: s,
                ...s
            }));
        }

        const payload = { suggestions: preds };
        cache.set(cacheKey, payload);
        return res.json(payload);
    } catch (err) {
        console.error('Mapbox autocomplete error', err);
        return res.status(500).json({ error: 'Internal' });
    }
};
