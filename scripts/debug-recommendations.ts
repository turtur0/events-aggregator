// scripts/debug-recommendations.ts
// Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/debug-recommendations.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import UserInteraction from '@/lib/models/UserInteraction';
import UserFavourite from '@/lib/models/UserFavourites';
import { getPersonalizedRecommendations } from '@/lib/ml/userProfileService';
import { buildUserVectorFromInteractions, computeUserProfile } from '@/lib/ml/userProfileService';
import mongoose from 'mongoose';

async function debugUserRecommendations(userEmail: string) {
    await connectDB();

    console.log('\n=== DEBUGGING RECOMMENDATIONS ===\n');

    // 1. Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
        console.error('❌ User not found:', userEmail);
        return;
    }

    console.log('✅ User found:', user.email);
    console.log('   User ID:', user._id.toString());
    console.log('   Name:', user.name);

    // 2. Check user preferences
    console.log('\n📋 User Preferences:');
    console.log('   Categories:', user.preferences?.selectedCategories);
    console.log('   Category Weights:', user.preferences?.categoryWeights);
    console.log('   Locations:', user.preferences?.locations);
    console.log('   Price Range:', user.preferences?.priceRange);
    console.log('   Popularity Pref:', user.preferences?.popularityPreference);

    // 3. Check interaction history
    const interactions = await UserInteraction.find({
        userId: user._id
    }).sort({ timestamp: -1 }).limit(20);

    console.log('\n🔄 Recent Interactions (last 20):');
    if (interactions.length === 0) {
        console.log('   ⚠️ NO INTERACTIONS FOUND - This is likely the issue!');
    } else {
        const interactionCounts = interactions.reduce((acc, int) => {
            acc[int.interactionType] = (acc[int.interactionType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        console.log('   Counts:', interactionCounts);
        console.log('   Most recent:', interactions.slice(0, 5).map(i => ({
            type: i.interactionType,
            date: i.timestamp.toISOString()
        })));
    }

    // 4. Check favorites
    const favorites = await UserFavourite.find({
        userId: user._id
    }).populate('eventId');

    console.log('\n⭐ Favorites:');
    console.log('   Count:', favorites.length);
    if (favorites.length > 0) {
        const favoriteCategories = favorites.reduce((acc: any, fav: any) => {
            const cat = fav.eventId?.category || 'unknown';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        console.log('   By Category:', favoriteCategories);
    }

    // 5. Build user vector
    console.log('\n🧮 Building User Vector...');
    const vectorData = await buildUserVectorFromInteractions(user._id);

    if (!vectorData) {
        console.log('   ⚠️ No interaction-based vector (cold start)');
    } else {
        console.log('   ✅ Vector built from', vectorData.count, 'interactions');
        console.log('   Confidence:', (vectorData.confidence * 100).toFixed(1) + '%');
    }

    // 6. Compute full profile
    console.log('\n👤 Computing User Profile...');
    const profile = await computeUserProfile(user._id, user);
    console.log('   Confidence:', (profile.confidence * 100).toFixed(1) + '%');
    console.log('   Interaction Count:', profile.interactionCount);
    console.log('   Dominant Categories:', profile.dominantCategories);
    console.log('   Last Updated:', profile.lastUpdated);

    // 7. Get recommendations
    console.log('\n🎯 Generating Recommendations...');
    const recommendations = await getPersonalizedRecommendations(
        user._id as mongoose.Types.ObjectId,
        user,
        { limit: 10, excludeFavorited: true }
    );

    console.log('   ✅ Generated', recommendations.length, 'recommendations');
    console.log('\n   Top 5 Recommendations:');
    recommendations.slice(0, 5).forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec.event.title}`);
        console.log(`      Category: ${rec.event.category}`);
        console.log(`      Score: ${rec.score.toFixed(4)}`);
        console.log(`      Reason: ${rec.explanation.reason}`);
        console.log(`      Content Similarity: ${rec.explanation.contentSimilarity.toFixed(4)}`);
        console.log(`      Popularity Boost: ${rec.explanation.popularityBoost.toFixed(4)}`);
        console.log('');
    });

    // 8. Recommendations changing over time test
    console.log('\n🔄 Testing if recommendations change...');
    console.log('   Waiting 1 second and fetching again...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const recommendations2 = await getPersonalizedRecommendations(
        user._id as mongoose.Types.ObjectId,
        user,
        { limit: 10, excludeFavorited: true }
    );

    const firstIds = recommendations.slice(0, 5).map(r => r.event._id.toString());
    const secondIds = recommendations2.slice(0, 5).map(r => r.event._id.toString());
    const identical = JSON.stringify(firstIds) === JSON.stringify(secondIds);

    if (identical) {
        console.log('   ✅ Top 5 are identical (expected for same user state)');
    } else {
        console.log('   ⚠️ Top 5 are different (might indicate randomness or caching issues)');
        console.log('   First fetch:', firstIds);
        console.log('   Second fetch:', secondIds);
    }

    console.log('\n=== END DEBUG ===\n');

    await mongoose.connection.close();
}

// Usage: Replace with actual user email
const userEmail = process.argv[2] || 'test@example.com';
debugUserRecommendations(userEmail);