/**
 * test-metadata.ts
 *
 * Test metadata extraction from a video transcript.
 *
 * Usage:
 *   bun run scripts/test-metadata.ts <videoId>
 *   bun run scripts/test-metadata.ts dQw4w9WgXcQ
 */

import { fetchTranscript } from '../src/index';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
	console.log(`
Usage: bun run scripts/test-metadata.ts <videoId>

Example:
  bun run scripts/test-metadata.ts dQw4w9WgXcQ
`);
	process.exit(0);
}

const videoId = args[0];

console.log(`\nFetching transcript with metadata for: ${videoId}\n`);

try {
	// Test with metadata
	const result = await fetchTranscript(videoId, {
		format: 'json',
		includeMetadata: true,
	});

	console.log('✓ Successfully fetched transcript with metadata\n');

	if ('transcript' in result && 'metadata' in result) {
		console.log('📊 Metadata:');
		console.log(`  Title: ${result.metadata.title}`);
		console.log(`  Author: ${result.metadata.author}`);
		console.log(`  Channel ID: ${result.metadata.channelId}`);
		console.log(
			`  Duration: ${result.metadata.durationSeconds ?? 'N/A'} seconds`,
		);
		console.log(`  URL: ${result.metadata.url}`);
		console.log(`  Video ID: ${result.metadata.videoId}`);

		if (result.metadata.keywords && result.metadata.keywords.length > 0) {
			console.log(
				`  Keywords: ${result.metadata.keywords.slice(0, 3).join(', ')}...`,
			);
		}

		console.log(`\n📝 Transcript segments: ${result.transcript.length}`);
		console.log('  First 3 segments:');
		result.transcript.slice(0, 3).forEach((item, idx) => {
			console.log(
				`    [${idx}] ${item.offset}s - "${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}"`,
			);
		});
	} else {
		console.log('❌ Response format unexpected');
		console.log(result);
	}
} catch (error) {
	console.error('❌ Error:', error instanceof Error ? error.message : error);
	process.exit(1);
}
