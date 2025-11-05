import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
    name: string;
    email: string;
    subject: 'general' | 'support' | 'report' | 'feedback' | 'partnership';
    message: string;
    status: 'new' | 'read' | 'in-progress' | 'resolved' | 'closed';
    response?: string;
    respondedBy?: mongoose.Types.ObjectId;
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
        },
        subject: {
            type: String,
            enum: ['general', 'support', 'report', 'feedback', 'partnership'],
            required: [true, 'Subject is required'],
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
            maxlength: [2000, 'Message cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: ['new', 'read', 'in-progress', 'resolved', 'closed'],
            default: 'new',
        },
        response: {
            type: String,
            trim: true,
            maxlength: [5000, 'Response cannot exceed 5000 characters'],
        },
        respondedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        respondedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
contactSchema.index({ email: 1 });
contactSchema.index({ subject: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

export default mongoose.model<IContact>('Contact', contactSchema);
