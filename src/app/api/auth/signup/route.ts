
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

interface SignupRequest {
    email: string;
    password: string;
    name: string;
    username?: string;
}

/**
 * POST /api/auth/signup
 * Creates a new user account with email/password authentication.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, password, name, username } = await request.json() as SignupRequest;

        // Validate required fields
        const validationError = validateSignupData({ email, password, name, username });
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 });
        }

        await connectDB();

        // Check for existing user
        const existingError = await checkExistingUser(email, username);
        if (existingError) {
            return NextResponse.json({ error: existingError }, { status: 409 });
        }

        // Create user with hashed password
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            name,
            username: username?.toLowerCase(),
            passwordHash,
            provider: 'credentials',
            preferences: createDefaultPreferences(),
        });

        return NextResponse.json(
            {
                message: 'User created successfully',
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: error.message || 'Signup failed' },
            { status: 500 }
        );
    }
}

/** Validates signup data and returns error message if invalid. */
function validateSignupData({ email, password, name, username }: SignupRequest): string | null {
    if (!email || !password || !name) {
        return 'Missing required fields';
    }

    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }

    if (username) {
        if (username.length < 3) {
            return 'Username must be at least 3 characters';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return 'Username can only contain letters, numbers, and underscores';
        }
    }

    return null;
}

/** Checks for existing user with same email or username. */
async function checkExistingUser(email: string, username?: string): Promise<string | null> {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        return 'Email already registered';
    }

    if (username) {
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return 'Username already taken';
        }
    }

    return null;
}

/** Creates default user preferences. */
function createDefaultPreferences() {
    return {
        selectedCategories: [],
        selectedSubcategories: [],
        categoryWeights: {},
        priceRange: { min: 0, max: 500 },
        popularityPreference: 0.5,
        locations: ['Melbourne'],
        notifications: {
            inApp: true,
            email: false,
            emailFrequency: 'weekly',
        },
    };
}