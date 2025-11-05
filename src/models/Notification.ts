import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId; // recipient
    senderId: mongoose.Types.ObjectId;
    listingId?: mongoose.Types.ObjectId | null;
    messageId?: mongoose.Types.ObjectId | null;
    text?: string;
    read: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: false },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: false },
    text: { type: String, required: false },
    read: { type: Boolean, default: false },
}, { timestamps: true });

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
