// tests/integration/db.test.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Event from '@/lib/models/Event';

let mongoServer: MongoMemoryServer;

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Create in-memory MongoDB for tests
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    await Event.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear all collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('should connect to in-memory MongoDB', async () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it('should create and retrieve an event', async () => {
    const testEvent = await Event.create({
      title: 'Test Concert',
      description: 'A test event',
      category: 'Music',
      startDate: new Date('2025-12-01'),
      venue: {
        name: 'Test Venue',
        address: '123 Test St',
        suburb: 'Melbourne',
      },
      isFree: true,
      bookingUrl: 'https://example.com',
      source: 'ticketmaster',
      sourceId: 'test-123',
    });

    expect(testEvent._id).toBeDefined();
    expect(testEvent.title).toBe('Test Concert');

    const foundEvent = await Event.findById(testEvent._id);
    expect(foundEvent?.title).toBe('Test Concert');
  });

  it('should enforce unique source+sourceId constraint', async () => {
    const eventData = {
      title: 'Duplicate Test',
      description: 'Testing duplicates',
      category: 'Music',
      startDate: new Date('2025-12-01'),
      venue: {
        name: 'Test Venue',
        address: '123 Test St',
        suburb: 'Melbourne',
      },
      isFree: false,
      bookingUrl: 'https://example.com',
      source: 'ticketmaster' as const,
      sourceId: 'test-duplicate-123',
    };

    // First insert should succeed
    const first = await Event.create(eventData);
    expect(first._id).toBeDefined();
    
    // Second insert with same source+sourceId should fail
    await expect(Event.create(eventData)).rejects.toThrow(/duplicate key error/i);
  });

  it('should allow upsert on duplicate source + sourceId', async () => {
    const eventData = {
      title: 'Upsert Test',
      description: 'Testing upsert',
      category: 'Music',
      startDate: new Date('2025-12-01'),
      venue: {
        name: 'Test Venue',
        address: '123 Test St',
        suburb: 'Melbourne',
      },
      isFree: false,
      bookingUrl: 'https://example.com',
      source: 'ticketmaster' as const,
      sourceId: 'test-upsert-123',
    };

    // First insert
    await Event.create(eventData);
    
    // Upsert with updated data
    const updated = await Event.findOneAndUpdate(
      { source: 'ticketmaster', sourceId: eventData.sourceId },
      { ...eventData, title: 'Updated Title' },
      { upsert: true, new: true }
    );

    expect(updated?.title).toBe('Updated Title');
    
    // Should still only have 1 document
    const count = await Event.countDocuments();
    expect(count).toBe(1);
  });

  it('should handle events with missing optional fields', async () => {
    const minimalEvent = await Event.create({
      title: 'Minimal Event',
      description: 'No description available',
      category: 'Other',
      startDate: new Date('2025-12-01'),
      venue: {
        name: 'Venue TBA',
        address: 'TBA',
        suburb: 'Melbourne',
      },
      isFree: true,
      bookingUrl: 'https://example.com',
      source: 'ticketmaster',
      sourceId: 'test-minimal-123',
    });

    expect(minimalEvent.priceMin).toBeUndefined();
    expect(minimalEvent.priceMax).toBeUndefined();
    expect(minimalEvent.imageUrl).toBeUndefined();
    expect(minimalEvent.endDate).toBeUndefined();
  });

  it('should create text search index', async () => {
    // Create some events
    await Event.create({
      title: 'Rock Concert',
      description: 'Amazing rock music',
      category: 'Music',
      startDate: new Date('2025-12-01'),
      venue: {
        name: 'Rod Laver Arena',
        address: '123 Test St',
        suburb: 'Melbourne',
      },
      isFree: false,
      bookingUrl: 'https://example.com',
      source: 'ticketmaster',
      sourceId: 'test-search-1',
    });

    await Event.create({
      title: 'Jazz Night',
      description: 'Smooth jazz evening',
      category: 'Music',
      startDate: new Date('2025-12-02'),
      venue: {
        name: 'The Jazz Club',
        address: '456 Test Ave',
        suburb: 'Melbourne',
      },
      isFree: false,
      bookingUrl: 'https://example.com',
      source: 'ticketmaster',
      sourceId: 'test-search-2',
    });

    // Text search should work
    const results = await Event.find({ $text: { $search: 'rock' } });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Rock Concert');
  });
});