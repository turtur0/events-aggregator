// scripts/test-digest.ts
// Run with: tsx scripts/test-digest.ts your-email@example.com

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDigest() {
    const testEmail = process.argv[2];

    if (!testEmail) {
        console.error('Usage: tsx scripts/test-digest.ts <email>');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected ✓');

        // Dynamically import after DB connection
        const User = (await import('@/lib/models/User')).default;
        const { buildDigestContent } = await import('@/lib/services/emailDigestService');
        const { Resend } = await import('resend');
        const MonthlyDigestEmail = (await import('@/emails/MonthlyDigestEmail')).default;

        console.log(`\nFetching user: ${testEmail}`);
        const user = await User.findOne({ email: testEmail }).lean();

        if (!user) {
            console.error(`❌ User not found: ${testEmail}`);
            process.exit(1);
        }

        console.log(`✓ Found user: ${user.name}`);
        console.log(`  Categories: ${user.preferences.selectedCategories.join(', ') || 'none'}`);
        console.log(`  Keywords: ${user.preferences.notifications.keywords.join(', ') || 'none'}`);
        console.log(`  Email enabled: ${user.preferences.notifications.email}`);

        console.log('\n📦 Building digest content...');
        const content = await buildDigestContent(user, 'weekly');

        const stats = {
            keywordMatches: content.keywordMatches.length,
            updatedFavorites: content.updatedFavorites.length,
            recommendations: content.recommendations.reduce((sum, cat) => sum + cat.events.length, 0),
        };

        console.log('\n📊 Content Summary:');
        console.log(`  Keyword matches: ${stats.keywordMatches}`);
        console.log(`  Updated favorites: ${stats.updatedFavorites}`);
        console.log(`  Recommendations: ${stats.recommendations}`);

        content.recommendations.forEach(rec => {
            console.log(`    - ${rec.category}: ${rec.events.length} events`);
        });

        const hasContent = stats.keywordMatches > 0 || stats.updatedFavorites > 0 || stats.recommendations > 0;

        if (!hasContent) {
            console.log('\n⚠️  No content available - email would be skipped');
            console.log('\nTips to get content:');
            console.log('  1. Add categories in user preferences');
            console.log('  2. Add notification keywords');
            console.log('  3. Favorite some events');
            console.log('  4. Make sure there are upcoming events in the database');
            process.exit(0);
        }

        // Send email
        console.log('\n📧 Sending test email...');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from: 'Melbourne Events <onboarding@resend.dev>', // Use Resend test domain
            to: testEmail,
            subject: `[TEST] Your ${stats.keywordMatches + stats.updatedFavorites + stats.recommendations} curated events`,
            react: MonthlyDigestEmail({
                userName: user.name,
                keywordMatches: content.keywordMatches,
                updatedFavorites: content.updatedFavorites,
                recommendations: content.recommendations,
                unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
                preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
            }),
        });

        if (error) {
            console.error('❌ Email send failed:', error);
            process.exit(1);
        }

        console.log(`✅ Email sent successfully!`);
        console.log(`   Email ID: ${data?.id}`);
        console.log(`\nCheck your inbox: ${testEmail}`);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from database');
    }
}

testDigest();