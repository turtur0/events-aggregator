// ============================================
// Tests the email digest system end-to-end
// Usage: tsx scripts/dev/test-digest.ts <email> [frequency]
// Example: tsx scripts/dev/test-digest.ts test@example.com weekly
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDigest() {
    const testEmail = process.argv[2];
    const frequency = (process.argv[3] || 'weekly') as 'weekly' | 'monthly';

    if (!testEmail) {
        console.error('Usage: tsx scripts/dev/test-digest.ts <email> [frequency]');
        console.error('Example: tsx scripts/dev/test-digest.ts test@example.com weekly');
        process.exit(1);
    }

    if (!['weekly', 'monthly'].includes(frequency)) {
        console.error('Frequency must be "weekly" or "monthly"');
        process.exit(1);
    }

    try {
        console.log('========================================================');
        console.log('Email Digest Test');
        console.log('========================================================\n');

        console.log('Step 1: Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to database\n');

        // Import after DB connection
        const User = (await import('@/lib/models/User')).default;
        const Event = (await import('@/lib/models/Event')).default;
        const { sendScheduledDigests } = await import('@/lib/services');

        // Fetch and validate user
        console.log('Step 2: Fetching user configuration...');
        console.log(`Email: ${testEmail}`);
        const user = await User.findOne({ email: testEmail });

        if (!user) {
            console.error(`\nUser not found: ${testEmail}`);
            console.log('Create user first at: http://localhost:3000/signup');
            process.exit(1);
        }

        console.log(`Name: ${user.name}`);
        console.log(`Email notifications: ${user.preferences.notifications.email ? 'enabled' : 'disabled'}`);
        console.log(`Frequency: ${user.preferences.notifications.emailFrequency || 'not set'}`);
        console.log(`Categories: ${user.preferences.selectedCategories.join(', ') || 'none'}`);
        console.log(`Keywords: ${user.preferences.notifications.keywords.join(', ') || 'none'}`);
        console.log(`Last email sent: ${user.preferences.notifications.lastEmailSent?.toISOString() || 'never'}\n`);

        // Validate user settings
        if (!user.preferences.notifications.email) {
            console.error('Email notifications are disabled for this user');
            console.log('Enable in settings: http://localhost:3000/settings');
            process.exit(1);
        }

        if (user.preferences.notifications.emailFrequency !== frequency) {
            console.log(`Warning: User frequency is "${user.preferences.notifications.emailFrequency}" but testing "${frequency}"`);
            console.log('Temporarily updating user frequency for test...');
            user.preferences.notifications.emailFrequency = frequency;
            await user.save();
            console.log('User frequency updated\n');
        }

        // Check database content
        console.log('Step 3: Checking database content...');
        const totalEvents = await Event.countDocuments({
            startDate: { $gte: new Date() }
        });

        const lookbackDays = frequency === 'weekly' ? 7 : 30;
        const lookbackDate = user.preferences.notifications.lastEmailSent ||
            new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

        const recentEvents = await Event.countDocuments({
            startDate: { $gte: new Date() },
            scrapedAt: { $gte: lookbackDate }
        });

        console.log(`Total upcoming events: ${totalEvents}`);
        console.log(`New events since last email: ${recentEvents}`);

        if (totalEvents === 0) {
            console.error('\nNo events in database');
            console.log('Run scraper first: npm run scrape:all');
            process.exit(1);
        }

        if (recentEvents === 0) {
            console.log('\nWarning: No new events since last email');
            console.log('Email might be empty (only shows new content)');
            console.log('Options:');
            console.log('  - Run scraper to add new events: npm run scrape:all');
            console.log('  - Reset lastEmailSent date in user preferences');
        }

        // Preview content by category
        console.log('\nStep 4: Previewing digest content...');
        for (const category of user.preferences.selectedCategories) {
            const categoryEvents = await Event.countDocuments({
                category,
                startDate: { $gte: new Date() },
                scrapedAt: { $gte: lookbackDate }
            });
            console.log(`${category}: ${categoryEvents} new events`);
        }

        // Run the digest send
        console.log(`\nStep 5: Sending ${frequency} digest...');`);
        console.log('Simulating cron job execution\n');

        const results = await sendScheduledDigests(frequency);

        // Display results
        console.log('========================================================');
        console.log('Digest Results');
        console.log('========================================================');
        console.log(`Sent:     ${results.sent}`);
        console.log(`Skipped:  ${results.skipped}`);
        console.log(`Errors:   ${results.errors}`);
        console.log('========================================================\n');

        // Verify and provide feedback
        if (results.sent > 0) {
            console.log('Success: Email sent');
            console.log(`Check inbox: ${testEmail}`);
            console.log('Note: Check spam folder if not in inbox\n');

            const updatedUser = await User.findOne({ email: testEmail });
            console.log(`Last email sent updated to: ${updatedUser?.preferences.notifications.lastEmailSent?.toISOString()}`);
        } else if (results.skipped > 0) {
            console.log('Email skipped (no content)');
            console.log('Reasons:');
            console.log('  - No new events matching user preferences');
            console.log('  - No keyword matches');
            console.log('  - No updated favourites\n');
            console.log('To fix:');
            console.log('  1. Run scraper: npm run scrape:all');
            console.log('  2. Add keywords in settings');
            console.log('  3. Favourite some events');
            console.log('  4. Reset lastEmailSent date');
        } else if (results.errors > 0) {
            console.log('Email failed to send');
            console.log('Check logs above for error details');
        }

        // Summary
        console.log('\n========================================================');
        console.log('Test Summary');
        console.log('========================================================');
        console.log(`Email:           ${testEmail}`);
        console.log(`Frequency:       ${frequency}`);
        console.log(`Result:          ${results.sent > 0 ? 'SENT' : results.skipped > 0 ? 'SKIPPED' : 'FAILED'}`);
        console.log(`Database events: ${totalEvents} total, ${recentEvents} new`);
        console.log('========================================================\n');

        // Next steps
        if (results.sent > 0) {
            console.log('Next steps:');
            console.log('  1. Check email in inbox');
            console.log('  2. Verify content looks correct');
            console.log('  3. Test unsubscribe link works');
            console.log('  4. Set up production cron jobs\n');
            console.log('Production schedule:');
            console.log('  - Weekly: Every Sunday at 8 AM');
            console.log('  - Monthly: First Sunday of month at 8 AM');
            console.log('  - Use GitHub Actions or Vercel Cron');
        } else {
            console.log('Next steps to get content:');
            console.log('  1. Run: npm run scrape:all');
            console.log('  2. Add keywords: http://localhost:3000/settings');
            console.log('  3. Favourite events: http://localhost:3000/events');
            console.log('  4. Re-run this test');
        }

    } catch (error: any) {
        console.error('\nError:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from database');
    }
}

testDigest();