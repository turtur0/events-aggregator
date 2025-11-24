import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
    email: string;
    name: string;
    username?: string;
    passwordHash?: string;
    provider?: 'credentials' | 'google';

    preferences: {
        selectedCategories: string[];
        selectedSubcategories: string[];
        categoryWeights: Record<string, number>;
        priceRange: {
            min: number;
            max: number;
        };
        popularityPreference: number;
        locations: string[];
        notifications: {
            inApp: boolean;
            email: boolean;
            emailFrequency: 'instant' | 'daily' | 'weekly';
            keywords: string[];
            smartFiltering: {
                enabled: boolean;
                minRecommendationScore: number;
            };
            popularityFilter?: 'all' | 'mainstream' | 'niche' | 'personalized'; // ← ADD THIS
        };
    };

    userVector?: number[];
    clusterGroup?: string;

    createdAt: Date;
    updatedAt: Date;
}


const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            lowercase: true,
        },
        passwordHash: {
            type: String,
        },
        provider: {
            type: String,
            enum: ['credentials', 'google'],
            default: 'credentials',
        },

        preferences: {
            selectedCategories: {
                type: [String],
                default: [],
            },
            selectedSubcategories: {
                type: [String],
                default: [],
            },
            categoryWeights: {
                type: Map,
                of: Number,
                default: new Map(),
            },
            priceRange: {
                min: { type: Number, default: 0 },
                max: { type: Number, default: 500 },
            },
            popularityPreference: { type: Number, default: 0.5 },
            locations: { type: [String], default: ['Melbourne'] },
            notifications: {
                inApp: { type: Boolean, default: true },
                email: { type: Boolean, default: false },
                emailFrequency: {
                    type: String,
                    enum: ['instant', 'daily', 'weekly'],
                    default: 'weekly'
                },
                keywords: { type: [String], default: [] },
                smartFiltering: {
                    enabled: { type: Boolean, default: true },
                    minRecommendationScore: { type: Number, default: 0.6 },
                },
                popularityFilter: {  // ← ADD THIS ENTIRE BLOCK
                    type: String,
                    enum: ['all', 'mainstream', 'niche', 'personalized'],
                    default: 'personalized'
                },
            },
        },

        userVector: [Number],
        clusterGroup: String,
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;