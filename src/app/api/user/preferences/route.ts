
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

const ALL_CATEGORIES = ['music', 'theatre', 'sports', 'arts', 'family', 'other'];

/**
 * GET /api/user/preferences
 * Retrieves the current user's preferences.
 */
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

/**
 * POST /api/user/preferences
 * Creates or updates user preferences (used during onboarding).
 */
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

/**
 * PATCH /api/user/preferences
 * Partially updates user preferences.
 */
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
 * Builds the update fields object from request body.
 * Handles category weights, notifications, and other preferences.
 */
function buildPreferenceUpdateFields(body: any): Record<string, any> {
  const updateFields: Record<string, any> = {};

  // Category selection and weights
  if (body.selectedCategories !== undefined) {
    updateFields['preferences.selectedCategories'] = body.selectedCategories;
    updateFields['preferences.categoryWeights'] = calculateCategoryWeights(body.selectedCategories);
  } else if (body.categoryWeights !== undefined) {
    updateFields['preferences.categoryWeights'] = body.categoryWeights;
  }

  // Subcategories
  if (body.selectedSubcategories !== undefined) {
    updateFields['preferences.selectedSubcategories'] = body.selectedSubcategories;
  }

  // Popularity preference
  if (body.popularityPreference !== undefined) {
    updateFields['preferences.popularityPreference'] = body.popularityPreference;
  } else {
    updateFields['preferences.popularityPreference'] = 0.5;
  }

  // Price and venue preferences (defaults)
  updateFields['preferences.pricePreference'] = 0.5;
  updateFields['preferences.venuePreference'] = 0.5;

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
 * Calculates category weights based on selected categories.
 * Selected categories get 0.8 weight, others get 0.2.
 */
function calculateCategoryWeights(selectedCategories?: string[]): Record<string, number> {
  const weights: Record<string, number> = {};

  if (selectedCategories && Array.isArray(selectedCategories)) {
    ALL_CATEGORIES.forEach(cat => {
      weights[cat] = selectedCategories.includes(cat) ? 0.8 : 0.2;
    });
  } else {
    ALL_CATEGORIES.forEach(cat => {
      weights[cat] = 0.5;
    });
  }

  return weights;
}

/**
 * Applies notification settings to the update fields object.
 */
function applyNotificationSettings(updateFields: Record<string, any>, notifications: any) {
  if (notifications.inApp !== undefined) {
    updateFields['preferences.notifications.inApp'] = notifications.inApp;
  }
  if (notifications.email !== undefined) {
    updateFields['preferences.notifications.email'] = notifications.email;
  }
  if (notifications.emailFrequency !== undefined) {
    updateFields['preferences.notifications.emailFrequency'] = notifications.emailFrequency;
  }
  if (notifications.keywords !== undefined) {
    updateFields['preferences.notifications.keywords'] = Array.isArray(notifications.keywords)
      ? notifications.keywords
      : [];
  }
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
}