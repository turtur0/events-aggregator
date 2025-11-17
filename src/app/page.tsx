// app/page.tsx
import { connectDB } from './lib/db';
import Event from './lib/models/Event';

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  await connectDB();

  // Get count of events
  const eventCount = await Event.countDocuments();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Melbourne Events Aggregator
        </h1>
        <p className="mb-8">
          Discover concerts, shows, festivals, and events across Melbourne
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-gray-600">
          <h2 className="text-2xl font-semibold mb-2">
            Events in Database: {eventCount}
          </h2>
          {eventCount === 0 && (
            <p className="text-sm mt-2">
              Run <code className="bg-gray-100 px-2 py-1 rounded">npm run scrape:ticketmaster</code> to populate events
            </p>
          )}
        </div>
      </div>
    </main>
  );
}