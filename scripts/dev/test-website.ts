// ============================================
// test-website.ts
// Runs multiple website debug analyses
// Usage: tsx scripts/dev/test-website.ts
// ============================================

import { debugWebsite } from "./debug-website";
interface TestCase {
  name: string;
  url: string;
  outputFile: string;
}

const testCases: TestCase[] = [
  {
    name: 'Theatre',
    url: 'https://whatson.melbourne.vic.gov.au/tags/theatre',
    outputFile: 'debug-whatson-theatre.json',
  },
  {
    name: 'Music',
    url: 'https://whatson.melbourne.vic.gov.au/tags/music',
    outputFile: 'debug-whatson-music.json',
  },
  {
    name: 'Comedy',
    url: 'https://whatson.melbourne.vic.gov.au/tags/comedy',
    outputFile: 'debug-whatson-comedy.json',
  },
];

async function runTests() {
  console.log('========================================================');
  console.log('Website Scraping Feasibility Test Suite');
  console.log('========================================================\n');

  const results: { name: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];

    console.log(`Test ${i + 1}/${testCases.length}: ${test.name}`);
    console.log('─'.repeat(70));

    try {
      await debugWebsite(test.url, test.outputFile);
      results.push({ name: test.name, success: true });
      console.log(`${test.name} analysis complete\n`);
    } catch (error: any) {
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
      console.error(`${test.name} analysis failed: ${error.message}\n`);
    }

    // Wait between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      console.log('Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log('========================================================');
  console.log('Test Suite Complete');
  console.log('========================================================');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total tests:    ${results.length}`);
  console.log(`Successful:     ${successful}`);
  console.log(`Failed:         ${failed}`);
  console.log('========================================================\n');

  if (successful > 0) {
    console.log('Generated reports:');
    results
      .filter(r => r.success)
      .forEach(r => {
        const test = testCases.find(t => t.name === r.name);
        console.log(`  - ${test?.outputFile}`);
      });
  }

  if (failed > 0) {
    console.log('\nFailed tests:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }
}

runTests().catch(console.error);