import 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        name: string;
        username?: string;
        hasCompletedOnboarding: boolean;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            username?: string;
            hasCompletedOnboarding: boolean;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        name: string;
        email: string;
        username?: string;
        hasCompletedOnboarding: boolean;
    }
}