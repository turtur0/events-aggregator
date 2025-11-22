import mongoose, { Schema, Model } from 'mongoose';

export interface IUserFavorite {
    userId: mongoose.Types.ObjectId;
    eventId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const UserFavoriteSchema = new Schema<IUserFavorite>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventId: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    createdAt: { type: Date, default: Date.now },
});

// Unique constraint: user can only favorite an event once
UserFavoriteSchema.index({ userId: 1, eventId: 1 }, { unique: true });
UserFavoriteSchema.index({ userId: 1, createdAt: -1 });

const UserFavorite: Model<IUserFavorite> =
    mongoose.models.UserFavorite ||
    mongoose.model<IUserFavorite>('UserFavorite', UserFavoriteSchema);

export default UserFavorite;