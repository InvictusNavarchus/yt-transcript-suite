/**
 * inspect-player-response.ts
 *
 * Fetches the raw YouTube Innertube /player JSON for a given video ID and
 * pretty-prints the full response. Use this to verify that our
 * `YouTubePlayerResponse` types in `src/types.ts` still match reality,
 * or to discover new fields whenever YouTube changes their API.
 *
 * Usage:
 *   bun run scripts/inspect-player-response.ts <videoId>
 *   bun run scripts/inspect-player-response.ts dQw4w9WgXcQ
 *
 * Optional flags:
 *   --captions-only   Print only the captions subtree (smaller output)
 *   --http            Use HTTP instead of HTTPS
 */

import type { YouTubePlayerResponse } from '../src/types.ts';

const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
	console.log(`
Usage: bun run scripts/inspect-player-response.ts <videoId> [options]

Options:
  --captions-only   Print only the captions subtree
  --http            Use HTTP instead of HTTPS
  --help, -h        Show this help

Example:
  bun run scripts/inspect-player-response.ts dQw4w9WgXcQ
  bun run scripts/inspect-player-response.ts dQw4w9WgXcQ --captions-only
`);
	process.exit(0);
}

const videoId = args.find((a) => !a.startsWith('--'));
const captionsOnly = args.includes('--captions-only');

if (!videoId) {
	console.error('Error: No video ID provided.');
	process.exit(1);
}

// ── Step 1: Fetch watch page to extract the Innertube API key ────────────────
console.log(`\n[1/3] Fetching watch page for video: ${videoId}`);
const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

const watchRes = await fetch(watchUrl, {
	headers: { 'User-Agent': DEFAULT_USER_AGENT },
});

if (!watchRes.ok) {
	console.error(
		`Watch page request failed: ${watchRes.status} ${watchRes.statusText}`,
	);
	process.exit(1);
}

const watchBody = await watchRes.text();

if (watchBody.includes('class="g-recaptcha"')) {
	console.error(
		'Rate-limited by YouTube (recaptcha detected). Try again later.',
	);
	process.exit(1);
}

const apiKeyMatch =
	watchBody.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ||
	watchBody.match(/INNERTUBE_API_KEY\\":\\"([^"]+)\\"/);

if (!apiKeyMatch) {
	console.error('Could not extract INNERTUBE_API_KEY from the watch page.');
	process.exit(1);
}

const apiKey = apiKeyMatch[1];
console.log(`[2/3] Extracted API key: ${apiKey}`);

// ── Step 2: Call the Innertube /player endpoint ───────────────────────────────
const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
const playerBody = {
	context: {
		client: {
			clientName: 'ANDROID',
			clientVersion: '20.10.38',
		},
	},
	videoId,
};

console.log(`[3/3] Calling Innertube player endpoint…\n`);
const playerRes = await fetch(playerUrl, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'User-Agent': DEFAULT_USER_AGENT,
	},
	body: JSON.stringify(playerBody),
});

if (!playerRes.ok) {
	console.error(
		`Player request failed: ${playerRes.status} ${playerRes.statusText}`,
	);
	process.exit(1);
}

const playerJson = (await playerRes.json()) as YouTubePlayerResponse;

// ── Step 3: Print results ─────────────────────────────────────────────────────

if (captionsOnly) {
	const tracklist =
		playerJson?.captions?.playerCaptionsTracklistRenderer ??
		playerJson?.playerCaptionsTracklistRenderer;

	if (!tracklist) {
		console.log('No captions data found in this response.\n');
		console.log(
			'playabilityStatus:',
			JSON.stringify(playerJson?.playabilityStatus, null, 2),
		);
	} else {
		console.log('playerCaptionsTracklistRenderer:');
		console.log(JSON.stringify(tracklist, null, 2));
	}
} else {
	console.log('Full /player response:');
	console.log(JSON.stringify(playerJson, null, 2));
}

// ── Step 4: Type-check our model against the actual shape ────────────────────
// These checks serve as a smoke-test: if the key paths are missing, surface it.
console.log(
	'\n── Type model smoke check ──────────────────────────────────────',
);
console.log(
	`playabilityStatus.status : ${playerJson?.playabilityStatus?.status ?? '(missing)'}`,
);

const tracklist =
	playerJson?.captions?.playerCaptionsTracklistRenderer ??
	playerJson?.playerCaptionsTracklistRenderer;

const tracks = tracklist?.captionTracks ?? [];
console.log(`captionTracks count      : ${tracks.length}`);

for (const track of tracks) {
	console.log(
		`  → [${track.languageCode}]  baseUrl: ${track.baseUrl?.slice(0, 60)}…`,
	);
}

if (tracks.length === 0) {
	console.log('  (no caption tracks — video may not have captions)');
}
console.log(
	'───────────────────────────────────────────────────────────────\n',
);
