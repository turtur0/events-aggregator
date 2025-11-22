import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const pathname = request.nextUrl.pathname;

    // Redirect unauthenticated users from protected routes
    if (!session) {
        if (pathname.startsWith('/profile') || pathname.startsWith('/onboarding')) {
            return NextResponse.redirect(
                new URL(`/auth/signin?from=${pathname}`, request.url)
            );
        }
    }

    // Redirect authenticated users away from auth pages
    if (session && (pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup'))) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/profile/:path*',
        '/onboarding/:path*',
        '/auth/signin',
        '/auth/signup',
    ],
};