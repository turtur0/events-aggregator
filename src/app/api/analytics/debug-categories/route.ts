import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Event from '@/lib/models/Event';

export async function GET() {
    try {
        await connectDB();

        // Get all unique categories from database
        const categories = await Event.distinct('category');

        // Get count for each category
        const categoryCounts = await Event.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    paidCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$isFree', false] },
                                        { $gt: ['$priceMin', 0] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get sample events from each category
        const samples = await Promise.all(
            categories.slice(0, 10).map(async (cat) => {
                const sample = await Event.findOne({ category: cat })
                    .select('title category subcategories priceMin priceMax isFree')
                    .lean();
                return sample;
            })
        );

        return NextResponse.json({
            uniqueCategories: categories,
            categoryCounts,
            sampleEvents: samples,
            totalEvents: await Event.countDocuments(),
            paidEvents: await Event.countDocuments({
                isFree: false,
                priceMin: { $exists: true, $gt: 0 }
            })
        });
    } catch (error) {
        console.error('[Debug] Category debug error:', error);
        return NextResponse.json({ error: 'Failed to debug categories' }, { status: 500 });
    }
}