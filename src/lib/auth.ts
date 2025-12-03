import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { connectDB } from './db';
import User from './models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Invalid credentials');
                }

                try {
                    await connectDB();

                    const user = await User.findOne({ email: credentials.email });

                    if (!user) {
                        throw new Error('User not found');
                    }

                    if (user.provider === 'google') {
                        throw new Error('Please sign in with Google');
                    }

                    if (!user.passwordHash) {
                        throw new Error('Invalid credentials');
                    }

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    );

                    if (!isPasswordValid) {
                        throw new Error('Invalid password');
                    }

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        username: user.username,
                        hasCompletedOnboarding: user.preferences.selectedCategories.length > 0,
                    };
                } catch (error: any) {
                    throw new Error(error.message);
                }
            },
        }),
    ],

    callbacks: {
        async signIn({ user, account }) {
            try {
                if (account?.provider === 'google') {
                    await connectDB();

                    const existingUser = await User.findOne({ email: user.email });

                    if (!existingUser) {
                        const newUser = await User.create({
                            email: user.email,
                            name: user.name,
                            provider: 'google',
                            preferences: {
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
                            },
                        });
                        user.id = newUser._id.toString();
                        user.username = newUser.username;
                    } else {
                        user.id = existingUser._id.toString();
                        user.username = existingUser.username;
                        // Update name in case it changed in Google
                        user.name = existingUser.name;
                    }
                }
                return true;
            } catch (error) {
                console.error('Sign in error:', error);
                return false;
            }
        },

        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.username = user.username;
                token.hasCompletedOnboarding = user.hasCompletedOnboarding;
            }

            // Handle manual session updates (from settings page)
            if (trigger === 'update') {
                try {
                    await connectDB();
                    const dbUser = await User.findById(token.id);

                    if (dbUser) {
                        // Update token with fresh data from database
                        token.name = dbUser.name;
                        token.username = dbUser.username;
                        token.hasCompletedOnboarding =
                            dbUser.preferences?.selectedCategories?.length > 0;
                    }
                } catch (error) {
                    console.error('Error updating token:', error);
                }
            }

            // Refresh onboarding status if not completed
            if (token.email && !token.hasCompletedOnboarding) {
                try {
                    await connectDB();
                    const dbUser = await User.findOne({ email: token.email });
                    if (dbUser) {
                        token.name = dbUser.name;
                        token.username = dbUser.username;
                        token.hasCompletedOnboarding =
                            dbUser.preferences?.selectedCategories?.length > 0;
                    }
                } catch (error) {
                    console.error('Error refreshing user data:', error);
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                session.user.username = token.username as string | undefined;
                session.user.hasCompletedOnboarding = token.hasCompletedOnboarding as boolean;
            }
            return session;
        },
    },

    pages: {
        signIn: '/auth/signin',
    },

    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },

    secret: process.env.NEXTAUTH_SECRET,
};