// tests/sources/ticketmaster.test.ts
import { fetchTicketmasterEvents } from '../../src/app/lib/scrapers/ticketmaster';

// Mock fetch globally
global.fetch = jest.fn();

// Spy on console to suppress logs during tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Ticketmaster API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should fetch events successfully', async () => {
    const mockResponse = {
      _embedded: {
        events: [
          {
            id: 'test123',
            name: 'Test Event',
            url: 'https://example.com',
            dates: { start: { localDate: '2025-12-01' } },
          },
        ],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const events = await fetchTicketmasterEvents(0, 1);

    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('Test Event');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Verify API call includes Melbourne coordinates (URL encoded)
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('latlong=-37.8136%2C144.9631'); // %2C is URL-encoded comma
    expect(callUrl).toContain('radius=50');
    expect(callUrl).toContain('app.ticketmaster.com');
  });

  it('should handle empty results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ page: { totalElements: 0 } }),
    });

    const events = await fetchTicketmasterEvents();

    expect(events).toHaveLength(0);
    expect(consoleLogSpy).toHaveBeenCalledWith('No events found from Ticketmaster');
  });

  it('should throw error when API key is missing', async () => {
    const originalKey = process.env.TICKETMASTER_API_KEY;
    delete process.env.TICKETMASTER_API_KEY;

    await expect(fetchTicketmasterEvents()).rejects.toThrow(
      'TICKETMASTER_API_KEY not found'
    );

    process.env.TICKETMASTER_API_KEY = originalKey;
  });

  it('should throw error on failed API request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(fetchTicketmasterEvents()).rejects.toThrow(
      'Ticketmaster API error: 401'
    );
    
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    await expect(fetchTicketmasterEvents()).rejects.toThrow('Network error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});