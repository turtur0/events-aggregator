import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from './db';
import User from './models/User';

export const authOptions: NextAuthOptions = {
    providers: [
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
                        hasCompletedOnboarding: user.preferences?.selectedCategories?.length > 0,
                    };
                } catch (error: any) {
                    throw new Error(error.message);
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.hasCompletedOnboarding = user.hasCompletedOnboarding;
            }

            // When session is updated (e.g., after onboarding)
            if (trigger === 'update' && session) {
                token.hasCompletedOnboarding = session.hasCompletedOnboarding;
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    secret: process.env.NEXTAUTH_SECRET,
};