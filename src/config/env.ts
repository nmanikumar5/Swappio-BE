import dotenv from 'dotenv';

/*
  Load .env only for non-production by default. In CI/CD or production (for
  example Vercel) environment variables are provided by the platform and
  loading a local `.env` file can accidentally bake secrets into a build or
  runtime image. If you intentionally need to force `.env` to load in
  production for debugging, set DOTENV_OVERRIDE=true in the environment.

  Tip: when building Docker images or deploying to Vercel, avoid including a
  `.env` file in the build context — see https://dotenvx.com/prebuild
*/
const isProduction = process.env.NODE_ENV === 'production';
const forceDotenv = process.env.DOTENV_OVERRIDE === 'true';

if (!isProduction || forceDotenv) {
  // In development we want .env to override any existing envs so local
  // values are authoritative. When forcing in production, also allow override
  // (use cautiously).
  dotenv.config({ override: true });
} else {
  // In production and not explicitly forced — do not load local .env
  // to avoid accidentally shipping secrets.
  // Still call dotenv.config() without override might be omitted on purpose.
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/swappio',
  jwtSecret: (process.env.JWT_SECRET || 'your_jwt_secret_key') as string,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  ola: {
    autocompleteUrl: process.env.OLA_AUTOCOMPLETE_URL || '',
    apiKey: process.env.OLA_API_KEY || '',
    // Optional token that clients must present when calling the BE proxy
    proxyToken: process.env.OLA_PROXY_TOKEN || '',
  },
  mapbox: {
    // Server-side token for Mapbox (kept secret)
    token: process.env.MAPBOX_TOKEN || '',
    // Optional upstream autocomplete URL (if using a proxyable endpoint)
    autocompleteUrl: process.env.MAPBOX_AUTOCOMPLETE_URL || 'https://api.mapbox.com/geocoding/v5/mapbox.places',
    // Optional proxy token that clients must present to call the BE Mapbox proxy
    proxyToken: process.env.MAPBOX_PROXY_TOKEN || '',
  },
  // Optional symmetric encryption key (base64) used to encrypt user passwords for reversible storage (dev only)
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // Twilio SMS
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  // Maximum number of active refresh tokens per user (rotate & trim)
  maxRefreshTokensPerUser: parseInt(process.env.MAX_REFRESH_TOKENS_PER_USER || '5'),
};
