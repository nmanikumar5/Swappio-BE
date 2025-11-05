import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Helper functions for encryption/decryption
function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
        iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
        iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export interface IAppConfig extends Document {
    key: string;
    value: string;
    encrypted: boolean;
    category: 'oauth' | 'api_keys' | 'payment' | 'features' | 'email' | 'sms' | 'storage' | 'general';
    description?: string;
    isActive: boolean;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;

    // Virtual methods
    getDecryptedValue(): string;
    setEncryptedValue(value: string): void;
}

// Define static methods interface
interface IAppConfigModel extends Model<IAppConfig> {
    getConfigValue(key: string, defaultValue?: string): Promise<string>;
    setConfigValue(
        key: string,
        value: string,
        options?: {
            encrypted?: boolean;
            category?: IAppConfig['category'];
            description?: string;
            metadata?: Record<string, any>;
        }
    ): Promise<IAppConfig>;
    getConfigsByCategory(category: string): Promise<IAppConfig[]>;
}

const appConfigSchema = new Schema<IAppConfig, IAppConfigModel>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        value: {
            type: String,
            required: true,
        },
        encrypted: {
            type: Boolean,
            default: false,
        },
        category: {
            type: String,
            enum: ['oauth', 'api_keys', 'payment', 'features', 'email', 'sms', 'storage', 'general'],
            required: true,
            index: true,
        },
        description: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
appConfigSchema.index({ category: 1, isActive: 1 });
appConfigSchema.index({ key: 1, isActive: 1 });

// Instance methods
appConfigSchema.methods.getDecryptedValue = function (): string {
    if (this.encrypted) {
        try {
            return decrypt(this.value);
        } catch (error) {
            console.error('Failed to decrypt config value:', error);
            return '';
        }
    }
    return this.value;
};

appConfigSchema.methods.setEncryptedValue = function (value: string): void {
    if (this.encrypted) {
        this.value = encrypt(value);
    } else {
        this.value = value;
    }
};

// Static method to get config value
appConfigSchema.statics.getConfigValue = async function (
    key: string,
    defaultValue?: string
): Promise<string> {
    const config = await this.findOne({ key, isActive: true });
    if (!config) return defaultValue || '';

    return config.getDecryptedValue();
};

// Static method to set config value
appConfigSchema.statics.setConfigValue = async function (
    key: string,
    value: string,
    options?: {
        encrypted?: boolean;
        category?: 'oauth' | 'api_keys' | 'payment' | 'features' | 'email' | 'sms' | 'storage' | 'general';
        description?: string;
        metadata?: Record<string, any>;
    }
): Promise<IAppConfig> {
    const config = await this.findOne({ key });

    if (config) {
        config.encrypted = options?.encrypted || config.encrypted;
        config.setEncryptedValue(value);
        if (options?.category) config.category = options.category as IAppConfig['category'];
        if (options?.description) config.description = options.description;
        if (options?.metadata) config.metadata = options.metadata;
        await config.save();
        return config;
    }

    const newConfig = new this({
        key,
        encrypted: options?.encrypted || false,
        category: options?.category || 'general',
        description: options?.description,
        metadata: options?.metadata,
    });
    newConfig.setEncryptedValue(value);
    await newConfig.save();
    return newConfig;
};

// Static method to get all configs by category
appConfigSchema.statics.getConfigsByCategory = async function (
    category: string
): Promise<IAppConfig[]> {
    return this.find({ category, isActive: true });
};

const AppConfig = mongoose.model<IAppConfig, IAppConfigModel>('AppConfig', appConfigSchema);

export default AppConfig;
