import { Request, Response } from 'express';
import AppConfig from '../models/AppConfig';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';

// @desc    Get public configurations (non-encrypted only)
// @route   GET /api/config/public
// @access  Public
export const getPublicConfigs = asyncHandler(async (req: Request, res: Response) => {
    // Whitelist of keys that are safe to expose publicly
    // SECURITY: Only configs in this list will be exposed to unauthenticated users
    const PUBLIC_CONFIG_KEYS = [
        'ENABLE_EMAIL_VERIFICATION',
        'ENABLE_SMS_VERIFICATION',
        'ENABLE_CHAT',
        'ENABLE_NOTIFICATIONS',
        'FREE_ADS_PER_MONTH',
        'MAX_IMAGE_SIZE_MB',
        'CLOUDINARY_CLOUD_NAME', // Safe: Used for image URLs
        'GOOGLE_CLIENT_ID', // Safe: OAuth client IDs are meant to be public
    ];

    // Only return whitelisted, non-encrypted, active configurations
    const configs = await AppConfig.find({
        key: { $in: PUBLIC_CONFIG_KEYS },
        encrypted: false,
        isActive: true
    }).select('key value category description');

    // Transform to key-value pairs for easy frontend consumption
    const configMap: Record<string, string> = {};
    configs.forEach((config) => {
        configMap[config.key] = config.value;
    });

    sendSuccess(res, 200, { configs: configMap }, 'Public configurations retrieved successfully');
});

// @desc    Get all configurations
// @route   GET /api/admin/config
// @access  Private/Admin
export const getAllConfigs = asyncHandler(async (req: Request, res: Response) => {
    const { category, search } = req.query;

    const query: any = { isActive: true };

    if (category) {
        query.category = category;
    }

    if (search) {
        query.$or = [
            { key: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    const configs = await AppConfig.find(query).sort({ category: 1, key: 1 });

    // Don't send encrypted values to frontend - mask them
    const safeConfigs = configs.map((config) => ({
        id: config._id,
        key: config.key,
        value: config.encrypted ? '••••••••' : config.value,
        encrypted: config.encrypted,
        category: config.category,
        description: config.description,
        isActive: config.isActive,
        metadata: config.metadata,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
    }));

    sendSuccess(res, 200, { configs: safeConfigs }, 'Configurations retrieved successfully');
});

// @desc    Get configuration by key
// @route   GET /api/admin/config/:key
// @access  Private/Admin
export const getConfigByKey = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    const config = await AppConfig.findOne({ key, isActive: true });

    if (!config) {
        return sendError(res, 404, 'Configuration not found');
    }

    const safeConfig = {
        id: config._id,
        key: config.key,
        value: config.encrypted ? '••••••••' : config.value,
        encrypted: config.encrypted,
        category: config.category,
        description: config.description,
        isActive: config.isActive,
        metadata: config.metadata,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
    };

    sendSuccess(res, 200, { config: safeConfig }, 'Configuration retrieved successfully');
});

// @desc    Create new configuration
// @route   POST /api/admin/config
// @access  Private/Admin
export const createConfig = asyncHandler(async (req: Request, res: Response) => {
    const { key, value, encrypted, category, description, metadata } = req.body;

    // Check if config already exists
    const existingConfig = await AppConfig.findOne({ key });
    if (existingConfig) {
        return sendError(res, 400, 'Configuration with this key already exists');
    }

    const config = await AppConfig.setConfigValue(key, value, {
        encrypted,
        category,
        description,
        metadata,
    });

    const safeConfig = {
        id: config._id,
        key: config.key,
        value: config.encrypted ? '••••••••' : config.value,
        encrypted: config.encrypted,
        category: config.category,
        description: config.description,
        isActive: config.isActive,
        metadata: config.metadata,
    };

    sendSuccess(res, 201, { config: safeConfig }, 'Configuration created successfully');
});

// @desc    Update configuration
// @route   PUT /api/admin/config/:key
// @access  Private/Admin
export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const { value, encrypted, category, description, metadata, isActive } = req.body;

    const config = await AppConfig.findOne({ key });

    if (!config) {
        return sendError(res, 404, 'Configuration not found');
    }

    // Update fields
    if (value !== undefined) {
        config.setEncryptedValue(value);
    }
    if (encrypted !== undefined) config.encrypted = encrypted;
    if (category !== undefined) config.category = category;
    if (description !== undefined) config.description = description;
    if (metadata !== undefined) config.metadata = metadata;
    if (isActive !== undefined) config.isActive = isActive;

    await config.save();

    const safeConfig = {
        id: config._id,
        key: config.key,
        value: config.encrypted ? '••••••••' : config.value,
        encrypted: config.encrypted,
        category: config.category,
        description: config.description,
        isActive: config.isActive,
        metadata: config.metadata,
    };

    sendSuccess(res, 200, { config: safeConfig }, 'Configuration updated successfully');
});

// @desc    Delete configuration
// @route   DELETE /api/admin/config/:key
// @access  Private/Admin
export const deleteConfig = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    const config = await AppConfig.findOne({ key });

    if (!config) {
        return sendError(res, 404, 'Configuration not found');
    }

    // Soft delete
    config.isActive = false;
    await config.save();

    sendSuccess(res, 200, null, 'Configuration deleted successfully');
});

// @desc    Get configurations by category
// @route   GET /api/admin/config/category/:category
// @access  Private/Admin
export const getConfigsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;

    const configs = await AppConfig.getConfigsByCategory(category);

    const safeConfigs = configs.map((config) => ({
        id: config._id,
        key: config.key,
        value: config.encrypted ? '••••••••' : config.value,
        encrypted: config.encrypted,
        category: config.category,
        description: config.description,
        isActive: config.isActive,
        metadata: config.metadata,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
    }));

    sendSuccess(res, 200, { configs: safeConfigs }, `${category} configurations retrieved successfully`);
});

// @desc    Seed default configurations
// @route   POST /api/admin/config/seed
// @access  Private/Admin
export const seedDefaultConfigs = asyncHandler(async (req: Request, res: Response) => {
    const defaultConfigs = [
        // OAuth
        {
            key: 'GOOGLE_CLIENT_ID',
            value: process.env.GOOGLE_CLIENT_ID || '',
            encrypted: false,
            category: 'oauth',
            description: 'Google OAuth Client ID for authentication',
        },
        {
            key: 'GOOGLE_CLIENT_SECRET',
            value: process.env.GOOGLE_CLIENT_SECRET || '',
            encrypted: true,
            category: 'oauth',
            description: 'Google OAuth Client Secret',
        },
        // API Keys
        {
            key: 'MAPBOX_API_KEY',
            value: process.env.MAPBOX_API_KEY || '',
            encrypted: true,
            category: 'api_keys',
            description: 'Mapbox API key for location services',
        },
        {
            key: 'OLA_API_KEY',
            value: process.env.OLA_API_KEY || '',
            encrypted: true,
            category: 'api_keys',
            description: 'Ola Maps API key for location services',
        },
        {
            key: 'CLOUDINARY_CLOUD_NAME',
            value: process.env.CLOUDINARY_CLOUD_NAME || '',
            encrypted: false,
            category: 'storage',
            description: 'Cloudinary cloud name for image storage',
        },
        {
            key: 'CLOUDINARY_API_KEY',
            value: process.env.CLOUDINARY_API_KEY || '',
            encrypted: true,
            category: 'storage',
            description: 'Cloudinary API key',
        },
        {
            key: 'CLOUDINARY_API_SECRET',
            value: process.env.CLOUDINARY_API_SECRET || '',
            encrypted: true,
            category: 'storage',
            description: 'Cloudinary API secret',
        },
        // Payment
        {
            key: 'RAZORPAY_KEY_ID',
            value: process.env.RAZORPAY_KEY_ID || '',
            encrypted: false,
            category: 'payment',
            description: 'Razorpay Key ID for payment processing',
        },
        {
            key: 'RAZORPAY_KEY_SECRET',
            value: process.env.RAZORPAY_KEY_SECRET || '',
            encrypted: true,
            category: 'payment',
            description: 'Razorpay Key Secret',
        },
        // Email
        {
            key: 'SENDGRID_API_KEY',
            value: process.env.SENDGRID_API_KEY || '',
            encrypted: true,
            category: 'email',
            description: 'SendGrid API key for email services',
        },
        {
            key: 'FROM_EMAIL',
            value: process.env.FROM_EMAIL || 'noreply@swappio.com',
            encrypted: false,
            category: 'email',
            description: 'Default sender email address',
        },
        // SMS
        {
            key: 'TWILIO_ACCOUNT_SID',
            value: process.env.TWILIO_ACCOUNT_SID || '',
            encrypted: false,
            category: 'sms',
            description: 'Twilio Account SID for SMS services',
        },
        {
            key: 'TWILIO_AUTH_TOKEN',
            value: process.env.TWILIO_AUTH_TOKEN || '',
            encrypted: true,
            category: 'sms',
            description: 'Twilio Auth Token',
        },
        {
            key: 'TWILIO_PHONE_NUMBER',
            value: process.env.TWILIO_PHONE_NUMBER || '',
            encrypted: false,
            category: 'sms',
            description: 'Twilio phone number for sending SMS',
        },
        // Features
        {
            key: 'ENABLE_EMAIL_VERIFICATION',
            value: 'true',
            encrypted: false,
            category: 'features',
            description: 'Enable email verification for new users',
        },
        {
            key: 'ENABLE_SMS_VERIFICATION',
            value: 'false',
            encrypted: false,
            category: 'features',
            description: 'Enable SMS verification for new users',
        },
        {
            key: 'ENABLE_CHAT',
            value: 'true',
            encrypted: false,
            category: 'features',
            description: 'Enable real-time chat feature',
        },
        {
            key: 'ENABLE_NOTIFICATIONS',
            value: 'true',
            encrypted: false,
            category: 'features',
            description: 'Enable push notifications',
        },
        {
            key: 'MAX_IMAGE_SIZE_MB',
            value: '5',
            encrypted: false,
            category: 'general',
            description: 'Maximum image upload size in MB',
        },
        {
            key: 'FREE_ADS_PER_MONTH',
            value: '3',
            encrypted: false,
            category: 'general',
            description: 'Number of free ads allowed per month',
        },
    ];

    let created = 0;
    let skipped = 0;

    for (const configData of defaultConfigs) {
        const existing = await AppConfig.findOne({ key: configData.key });
        if (!existing && configData.value) {
            await AppConfig.setConfigValue(configData.key, configData.value, {
                encrypted: configData.encrypted,
                category: configData.category as any,
                description: configData.description,
            });
            created++;
        } else {
            skipped++;
        }
    }

    sendSuccess(
        res,
        200,
        { created, skipped, total: defaultConfigs.length },
        'Default configurations seeded successfully'
    );
});
