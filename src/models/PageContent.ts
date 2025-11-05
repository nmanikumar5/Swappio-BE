import { Schema, model, Document, Types } from "mongoose";

export interface PageContentDocument extends Document {
    slug: string; // e.g., "privacy", "terms", "security", "help", "about"
    title: string;
    description: string;
    content: string; // Rich HTML content
    sectionTitle?: string; // For footer section reference
    isPublished: boolean;
    updatedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const pageContentSchema = new Schema<PageContentDocument>(
    {
        slug: {
            type: String,
            required: [true, "Page slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"],
        },
        title: {
            type: String,
            required: [true, "Page title is required"],
            maxlength: [200, "Title cannot exceed 200 characters"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Page description is required"],
            maxlength: [500, "Description cannot exceed 500 characters"],
            trim: true,
        },
        content: {
            type: String,
            required: [true, "Page content is required"],
            default: "",
        },
        sectionTitle: {
            type: String,
            default: null, // Reference to footer section if linked
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
pageContentSchema.index({ sectionTitle: 1 });
pageContentSchema.index({ isPublished: 1 });

const PageContent = model<PageContentDocument>("PageContent", pageContentSchema);

export default PageContent;
