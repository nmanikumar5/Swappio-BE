import mongoose, { Schema, Document } from "mongoose";

export interface IFooterLink {
    label: string;
    href: string;
}

export interface IFooterSection extends Document {
    title: string;
    links: IFooterLink[];
}

export interface ISocialLinks {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
}

export interface IFooterConfig extends Document {
    sections: IFooterSection[];
    brandName: string;
    brandDescription: string;
    contactEmail: string;
    contactPhone: string;
    socialLinks: ISocialLinks;
    isActive: boolean;
    updatedBy?: mongoose.Types.ObjectId;
}

const FooterLinkSchema: Schema = new Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        href: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

const FooterSectionSchema: Schema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
        links: [FooterLinkSchema],
    },
    { _id: false }
);

const SocialLinksSchema: Schema = new Schema(
    {
        facebook: {
            type: String,
            default: "",
            trim: true,
        },
        twitter: {
            type: String,
            default: "",
            trim: true,
        },
        instagram: {
            type: String,
            default: "",
            trim: true,
        },
        linkedin: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { _id: false }
);

const FooterConfigSchema: Schema = new Schema(
    {
        sections: [FooterSectionSchema],
        brandName: {
            type: String,
            required: true,
            default: "Swappio",
            trim: true,
            maxlength: 100,
        },
        brandDescription: {
            type: String,
            required: true,
            default: "Your trusted platform for secure item exchanges and swaps.",
            trim: true,
            maxlength: 500,
        },
        contactEmail: {
            type: String,
            required: true,
            default: "support@swappio.com",
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
        },
        contactPhone: {
            type: String,
            required: true,
            default: "+1 (234) 567-8900",
            trim: true,
            maxlength: 20,
        },
        socialLinks: {
            type: SocialLinksSchema,
            default: {},
        },
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

// Default sections
FooterConfigSchema.path("sections").default([
    {
        title: "Platform",
        links: [
            { label: "Browse Listings", href: "/" },
            { label: "Post an Ad", href: "/post-ad" },
            { label: "My Dashboard", href: "/dashboard" },
            { label: "Pricing Plans", href: "/plans" },
        ],
    },
    {
        title: "User",
        links: [
            { label: "My Favorites", href: "/favorites" },
            { label: "Messages", href: "/chat" },
            { label: "Profile Settings", href: "/dashboard/profile" },
        ],
    },
    {
        title: "Support",
        links: [
            { label: "Help Center", href: "/help" },
            { label: "Contact Us", href: "/contact" },
            { label: "Safety Tips", href: "/safety" },
            { label: "Report Problem", href: "/contact?subject=report" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Security", href: "/security" },
        ],
    },
]);

export default mongoose.model<IFooterConfig>("FooterConfig", FooterConfigSchema);
