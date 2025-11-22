// src/app/api/user/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

// GET - Fetch user preferences
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

// POST - Set preferences during onboarding (replaces all preferences)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await connectDB();

    const {
      selectedCategories,
      selectedSubcategories,
      popularityPreference,
      notifications,
    } = await request.json();

    // Initialise category weights based on selected categories
    const categoryWeights: Record<string, number> = {};
    selectedCategories.forEach((cat: string) => {
      categoryWeights[cat] = 0.5;
    });

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        'preferences.selectedCategories': selectedCategories,
        'preferences.selectedSubcategories': selectedSubcategories,
        'preferences.categoryWeights': categoryWeights,
        'preferences.popularityPreference': popularityPreference,
        'preferences.notifications': notifications,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Preferences updated',
      hasCompletedOnboarding: true,
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

// PATCH - Partially update preferences (for settings page)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();

    // Build update object dynamically based on what's provided
    const updateFields: Record<string, any> = {};

    if (body.selectedCategories !== undefined) {
      updateFields['preferences.selectedCategories'] = body.selectedCategories;
    }
    if (body.selectedSubcategories !== undefined) {
      updateFields['preferences.selectedSubcategories'] = body.selectedSubcategories;
    }
    if (body.categoryWeights !== undefined) {
      updateFields['preferences.categoryWeights'] = body.categoryWeights;
    }
    if (body.priceRange !== undefined) {
      updateFields['preferences.priceRange'] = body.priceRange;
    }
    if (body.popularityPreference !== undefined) {
      updateFields['preferences.popularityPreference'] = body.popularityPreference;
    }
    if (body.locations !== undefined) {
      updateFields['preferences.locations'] = body.locations;
    }
    if (body.notifications !== undefined) {
      updateFields['preferences.notifications'] = body.notifications;
    }

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateFields },
      { new: true }
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