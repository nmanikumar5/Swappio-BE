import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    name: string;
    slug: string;
    icon: string;
    description?: string;
    parentCategory?: mongoose.Types.ObjectId;
    subcategories?: mongoose.Types.ObjectId[];
    isActive: boolean;
    order: number;
    image?: string;
    metaTitle?: string;
    metaDescription?: string;
}

const CategorySchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Category name is required"],
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Category slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        icon: {
            type: String,
            required: [true, "Category icon is required"],
        },
        description: {
            type: String,
            trim: true,
        },
        parentCategory: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
        subcategories: [{
            type: Schema.Types.ObjectId,
            ref: "Category",
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        image: {
            type: String,
        },
        metaTitle: {
            type: String,
        },
        metaDescription: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast queries
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentCategory: 1 });
CategorySchema.index({ isActive: 1, order: 1 });

export default mongoose.model<ICategory>("Category", CategorySchema);
