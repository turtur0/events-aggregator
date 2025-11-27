
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getUnreadNotifications, getUnreadCount } from '@/lib/services';

/**
 * GET /api/notifications/unread
 * Retrieves unread notifications and count for the authenticated user.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
        }

        await connectDB();

        const [notifications, count] = await Promise.all([
            getUnreadNotifications(session.user.id),
            getUnreadCount(session.user.id),
        ]);

        return NextResponse.json({ notifications, count });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}