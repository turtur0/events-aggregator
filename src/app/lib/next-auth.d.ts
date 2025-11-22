import 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        hasCompletedOnboarding?: boolean;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            hasCompletedOnboarding?: boolean;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        hasCompletedOnboarding?: boolean;
    }
}