import { fetchTranscript } from '@youtube-transcript/core';

const API_KEY = process.env.SERVER_API_KEY;
const PORT = Number(process.env.PORT ?? 3456);

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
	if (!API_KEY) return true; // No key set → local-only trust model
	const header =
		req.headers.get('x-api-key') ??
		req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
	return header === API_KEY;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVideoId(raw: string): string {
	// Accept full YouTube URLs or bare IDs
	try {
		const url = new URL(raw);
		return url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? raw;
	} catch {
		return raw; // Already a bare ID
	}
}

function jsonError(message: string, status: number): Response {
	return Response.json({ error: message }, { status });
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = Bun.serve({
	port: PORT,
	idleTimeout: 60, // transcripts can take a moment

	routes: {
		'/transcript': {
			GET: async (req) => {
				console.log(`[server] received request: ${req.method} ${req.url}`);
				if (!isAuthorized(req)) {
					console.log(
						`[server] unauthorized request: ${req.method} ${req.url}`,
					);
					return jsonError('Unauthorized', 401);
				}

				const raw = new URL(req.url).searchParams.get('videoId');
				if (!raw) return jsonError('Missing video ID', 400);

				const videoId = extractVideoId(raw);
				console.log(`[transcript] running for: ${videoId}`);

				try {
					const transcript = await fetchTranscript(videoId, {
						format: 'text',
						includeMetadata: true,
						debug: true,
					});

					console.log(`[transcript] success for: ${videoId}`);
					return Response.json({ videoId, transcript: transcript.trim() });
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					console.error(`[transcript] error for ${videoId}: ${message}`);
					return Response.json(
						{ error: message || 'Failed to fetch transcript' },
						{ status: 502 },
					);
				}
			},
		},
	},

	// Fallback
	fetch(req) {
		console.log(`[server] received request: ${req.method} ${req.url}`);
		return Response.json(
			{
				error: 'Not found',
				hint: 'GET /transcript?videoId=<id-or-url>',
			},
			{ status: 404 },
		);
	},

	error(err) {
		console.error('[server] unhandled error:', err);
		return Response.json({ error: 'Internal server error' }, { status: 500 });
	},
});

console.log(`🎬 Transcript server listening on ${server.url}`);
if (!API_KEY) {
	console.warn(
		'⚠️  No SERVER_API_KEY set — requests are unauthenticated. Set it for security.',
	);
} else {
	console.log('🔑 API key auth enabled (x-api-key header or Bearer token).');
}
