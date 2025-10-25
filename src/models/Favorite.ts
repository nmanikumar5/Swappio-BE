import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate favorites and faster queries
favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export default mongoose.model<IFavorite>('Favorite', favoriteSchema);
