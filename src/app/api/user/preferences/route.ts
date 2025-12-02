import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

const ALL_CATEGORIES = ['music', 'theatre', 'sports', 'arts', 'family', 'other'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email }).select('preferences');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ preferences: user.preferences });
  } catch (error: any) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const updateFields = buildPreferenceUpdateFields(body);

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('preferences email name username _id');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Preferences updated',
      hasCompletedOnboarding: true,
      preferences: user.preferences,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const updateFields = buildPreferenceUpdateFields(body);

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('preferences');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Preferences updated',
      preferences: user.preferences
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * Builds update fields object for MongoDB from request body
 */
function buildPreferenceUpdateFields(body: any): Record<string, any> {
  const updateFields: Record<string, any> = {};

  // Category preferences
  if (body.selectedCategories !== undefined) {
    updateFields['preferences.selectedCategories'] = body.selectedCategories;
    updateFields['preferences.categoryWeights'] = calculateCategoryWeights(body.selectedCategories);
  } else if (body.categoryWeights !== undefined) {
    updateFields['preferences.categoryWeights'] = body.categoryWeights;
  }

  if (body.selectedSubcategories !== undefined) {
    updateFields['preferences.selectedSubcategories'] = body.selectedSubcategories;
  }

  // Popularity preference (defaults to 0.5 if not provided)
  if (body.popularityPreference !== undefined) {
    updateFields['preferences.popularityPreference'] = body.popularityPreference;
  } else {
    updateFields['preferences.popularityPreference'] = 0.5;
  }

  // Price range
  if (body.priceRange) {
    if (body.priceRange.min !== undefined) {
      updateFields['preferences.priceRange.min'] = body.priceRange.min;
    }
    if (body.priceRange.max !== undefined) {
      updateFields['preferences.priceRange.max'] = body.priceRange.max;
    }
  }

  // Locations
  if (body.locations !== undefined) {
    updateFields['preferences.locations'] = body.locations;
  }

  // Notification settings
  if (body.notifications) {
    applyNotificationSettings(updateFields, body.notifications);
  }

  return updateFields;
}

/**
 * Calculates category weights based on selected categories
 * Selected categories get 0.8, others get 0.2
 */
function calculateCategoryWeights(selectedCategories?: string[]): Record<string, number> {
  const weights: Record<string, number> = {};

  if (selectedCategories && Array.isArray(selectedCategories)) {
    ALL_CATEGORIES.forEach(category => {
      weights[category] = selectedCategories.includes(category) ? 0.8 : 0.2;
    });
  } else {
    // Default to 0.5 for all categories
    ALL_CATEGORIES.forEach(category => {
      weights[category] = 0.5;
    });
  }

  return weights;
}

/**
 * Applies notification settings to update fields object
 * Uses dot notation for nested MongoDB updates
 */
function applyNotificationSettings(updateFields: Record<string, any>, notifications: any) {
  // Basic notification toggles
  if (notifications.inApp !== undefined) {
    updateFields['preferences.notifications.inApp'] = notifications.inApp;
  }

  if (notifications.email !== undefined) {
    updateFields['preferences.notifications.email'] = notifications.email;
  }

  if (notifications.emailFrequency !== undefined) {
    updateFields['preferences.notifications.emailFrequency'] = notifications.emailFrequency;
  }

  // Keywords array
  if (notifications.keywords !== undefined) {
    updateFields['preferences.notifications.keywords'] = Array.isArray(notifications.keywords)
      ? notifications.keywords
      : [];
  }

  // Smart filtering settings
  if (notifications.smartFiltering) {
    if (notifications.smartFiltering.enabled !== undefined) {
      updateFields['preferences.notifications.smartFiltering.enabled'] =
        notifications.smartFiltering.enabled;
    }
    if (notifications.smartFiltering.minRecommendationScore !== undefined) {
      updateFields['preferences.notifications.smartFiltering.minRecommendationScore'] =
        notifications.smartFiltering.minRecommendationScore;
    }
  }

  // Email digest preferences
  if (notifications.includeFavouriteUpdates !== undefined) {
    updateFields['preferences.notifications.includeFavouriteUpdates'] =
      notifications.includeFavouriteUpdates;
  }

  if (notifications.recommendationsSize !== undefined) {
    updateFields['preferences.notifications.recommendationsSize'] =
      notifications.recommendationsSize;
  }

  // THE FIX: This was missing consistent handling
  if (notifications.customRecommendationsCount !== undefined) {
    updateFields['preferences.notifications.customRecommendationsCount'] =
      notifications.customRecommendationsCount;
  }
}