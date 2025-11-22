import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { connectDB } from '@/app/lib/db';
import User from '@/app/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const {
      selectedCategories,
      selectedSubcategories,
      popularityPreference,
      notifications,
    } = await request.json();

    // Initialize category weights based on selected categories
    // Start with equal weights, will be refined by user interaction
    const categoryWeights: Record<string, number> = {};
    selectedCategories.forEach((cat: string) => {
      categoryWeights[cat] = 0.5; // Neutral starting point
    });

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        'preferences.selectedCategories': selectedCategories,
        'preferences.selectedSubcategories': selectedSubcategories,
        'preferences.categoryWeights': categoryWeights,
        'preferences.popularityPreference': popularityPreference,
        'preferences.notifications': notifications,
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Preferences updated',
      user,
    });
  } catch (error: any) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);

    return NextResponse.json({ preferences: user?.preferences });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}