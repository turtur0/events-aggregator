
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { markAsRead, markAllAsRead } from '@/lib/services';

/**
 * POST /api/notifications/mark-read
 * Marks notifications as read for the authenticated user.
 * 
 * Body:
 * - notificationIds: array of notification IDs to mark as read
 * - markAll: boolean to mark all notifications as read
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const { notificationIds, markAll } = body;

        if (markAll) {
            await markAllAsRead(session.user.id);
        } else if (notificationIds && Array.isArray(notificationIds)) {
            await markAsRead(notificationIds);
        } else {
            return NextResponse.json(
                { error: 'Invalid request - provide either notificationIds or markAll' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return NextResponse.json(
            { error: 'Failed to mark notifications as read' },
            { status: 500 }
        );
    }
}