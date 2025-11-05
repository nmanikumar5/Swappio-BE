import AppConfig from '../models/AppConfig';

/**
 * Configuration Service
 * Provides easy access to configuration values stored in the database
 * Falls back to environment variables if config is not found in DB
 */
class ConfigService {
    private cache: Map<string, { value: string; timestamp: number }> = new Map();
    private cacheTTL = 5 * 60 * 1000; // 5 minutes cache

    /**
     * Get a configuration value by key
     * @param key - Configuration key
     * @param defaultValue - Default value if config not found
     * @param useCache - Whether to use cache (default: true)
     */
    async get(key: string, defaultValue?: string, useCache = true): Promise<string> {
        // Check cache first
        if (useCache) {
            const cached = this.cache.get(key);
            if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
                return cached.value;
            }
        }

        try {
            // Try to get from database
            const value = await AppConfig.getConfigValue(key, defaultValue);

            // Cache the value
            if (useCache && value) {
                this.cache.set(key, { value, timestamp: Date.now() });
            }

            return value;
        } catch (error) {
            console.error(`Failed to get config ${key}:`, error);
            return defaultValue || '';
        }
    }

    /**
     * Get a configuration value as boolean
     */
    async getBoolean(key: string, defaultValue = false): Promise<boolean> {
        const value = await this.get(key, String(defaultValue));
        return value.toLowerCase() === 'true' || value === '1';
    }

    /**
     * Get a configuration value as number
     */
    async getNumber(key: string, defaultValue = 0): Promise<number> {
        const value = await this.get(key, String(defaultValue));
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * Clear the cache for a specific key or all keys
     */
    clearCache(key?: string): void {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Set a configuration value
     */
    async set(
        key: string,
        value: string,
        options?: {
            encrypted?: boolean;
            category?: 'oauth' | 'api_keys' | 'payment' | 'features' | 'email' | 'sms' | 'storage' | 'general';
            description?: string;
        }
    ): Promise<void> {
        await AppConfig.setConfigValue(key, value, options);
        this.clearCache(key);
    }

    /**
     * Check if a feature is enabled
     */
    async isFeatureEnabled(featureName: string): Promise<boolean> {
        return this.getBoolean(`ENABLE_${featureName.toUpperCase()}`, false);
    }

    /**
     * Get all configurations by category
     */
    async getByCategory(category: string): Promise<Record<string, string>> {
        const configs = await AppConfig.getConfigsByCategory(category);
        const result: Record<string, string> = {};

        for (const config of configs) {
            result[config.key] = config.getDecryptedValue();
        }

        return result;
    }
}

// Export singleton instance
export const configService = new ConfigService();
