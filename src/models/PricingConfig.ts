import mongoose, { Schema, Document } from "mongoose";

export interface IPricingConfig extends Document {
    // Free Tier Settings
    freeAdsPerMonth: number;
    freeAdDuration: number;

    // Priority Pricing (in rupees)
    featuredAdPrice: number;
    featuredAdDuration: number;

    premiumAdPrice: number;
    premiumAdDuration: number;

    platinumAdPrice: number;
    platinumAdDuration: number;

    // Additional Ad Pricing
    additionalAdPrice: number;

    // Bulk Packages
    bulkPackages: {
        adCount: number;
        price: number;
        discountPercentage: number;
    }[];

    // Subscription Plans
    subscriptionPlans: {
        name: string;
        price: number;
        freeAds: number;
        discount: number;
        features: string[];
    }[];

    // Payment Gateway Settings
    razorpayEnabled: boolean;
    razorpayKeyId: string;

    stripeEnabled: boolean;
    stripePublishableKey: string;

    // Tax & Fees
    taxPercentage: number;
    platformFee: number;

    // Active status
    isActive: boolean;
    updatedBy: mongoose.Types.ObjectId;
}

const PricingConfigSchema: Schema = new Schema(
    {
        // Free Tier Settings
        freeAdsPerMonth: {
            type: Number,
            required: true,
            default: 10,
            min: 0,
        },
        freeAdDuration: {
            type: Number,
            required: true,
            default: 30,
            min: 1,
        },

        // Featured Ad Pricing
        featuredAdPrice: {
            type: Number,
            required: true,
            default: 99,
            min: 0,
        },
        featuredAdDuration: {
            type: Number,
            required: true,
            default: 7,
            min: 1,
        },

        // Premium Ad Pricing
        premiumAdPrice: {
            type: Number,
            required: true,
            default: 199,
            min: 0,
        },
        premiumAdDuration: {
            type: Number,
            required: true,
            default: 15,
            min: 1,
        },

        // Platinum Ad Pricing
        platinumAdPrice: {
            type: Number,
            required: true,
            default: 399,
            min: 0,
        },
        platinumAdDuration: {
            type: Number,
            required: true,
            default: 30,
            min: 1,
        },

        // Additional Ad Pricing
        additionalAdPrice: {
            type: Number,
            required: true,
            default: 49,
            min: 0,
        },

        // Bulk Packages
        bulkPackages: [
            {
                adCount: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                discountPercentage: {
                    type: Number,
                    required: true,
                    min: 0,
                    max: 100,
                },
            },
        ],

        // Subscription Plans
        subscriptionPlans: [
            {
                name: {
                    type: String,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                freeAds: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                discount: {
                    type: Number,
                    required: true,
                    min: 0,
                    max: 100,
                },
                features: [String],
            },
        ],

        // Payment Gateway Settings
        razorpayEnabled: {
            type: Boolean,
            default: true,
        },
        razorpayKeyId: {
            type: String,
            default: "",
        },

        stripeEnabled: {
            type: Boolean,
            default: false,
        },
        stripePublishableKey: {
            type: String,
            default: "",
        },

        // Tax & Fees
        taxPercentage: {
            type: Number,
            required: true,
            default: 18,
            min: 0,
            max: 100,
        },
        platformFee: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        // Active status
        isActive: {
            type: Boolean,
            default: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Default bulk packages
PricingConfigSchema.path("bulkPackages").default([
    { adCount: 10, price: 399, discountPercentage: 18 },
    { adCount: 25, price: 899, discountPercentage: 27 },
    { adCount: 50, price: 1599, discountPercentage: 35 },
]);

// Default subscription plans
PricingConfigSchema.path("subscriptionPlans").default([
    {
        name: "Basic",
        price: 199,
        freeAds: 15,
        discount: 20,
        features: ["15 free ads/month", "20% discount on premium ads", "Email support"],
    },
    {
        name: "Pro",
        price: 499,
        freeAds: 40,
        discount: 30,
        features: [
            "40 free ads/month",
            "30% discount on premium ads",
            "Verified seller badge",
            "Priority support",
        ],
    },
    {
        name: "Business",
        price: 999,
        freeAds: 100,
        discount: 40,
        features: [
            "100 free ads/month",
            "40% discount on premium ads",
            "Verified seller badge",
            "Premium support",
            "Analytics dashboard",
            "API access",
        ],
    },
]);

export default mongoose.model<IPricingConfig>("PricingConfig", PricingConfigSchema);
