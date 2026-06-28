#!/usr/bin/env bun

/**
 * CLI script to fetch and print a YouTube transcript.
 *
 * Usage:
 *   bunx --bun scripts/cli.ts <video-id-or-url> [options]
 *
 * Options:
 *   --format <json|srt|vtt|text>   Output format (default: text)
 *   --lang <code>                  Language code, e.g. "en", "fr" (default: auto)
 *   --metadata                     Include video metadata in output
 *   --help, -h                     Show this help message
 *
 * Examples:
 *   bun scripts/cli.ts https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   bun scripts/cli.ts dQw4w9WgXcQ --format srt
 *   bun scripts/cli.ts dQw4w9WgXcQ --format json --metadata
 *   bun scripts/cli.ts dQw4w9WgXcQ --lang fr --format text
 */

import clipboardy from 'clipboardy';
import { fetchTranscript } from '../src/index';
import type { TranscriptConfig } from '../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HELP = `
Usage: bun scripts/cli.ts <video-id-or-url> [options]

Options:
  --format <json|srt|vtt|text>   Output format  (default: text)
  --lang   <code>                Language code  (default: auto-detect)
  --metadata                     Include video metadata in the output
  --debug                        Save debug files to organized directory
  --debug-dir <path>             Debug directory (default: ./debug)
  --copy, -c                     Copy the output to the clipboard
  --help, -h                     Show this help message

Examples:
  bun scripts/cli.ts https://www.youtube.com/watch?v=dQw4w9WgXcQ
  bun scripts/cli.ts dQw4w9WgXcQ --format srt
  bun scripts/cli.ts dQw4w9WgXcQ --format json --metadata
  bun scripts/cli.ts dQw4w9WgXcQ --lang fr
  bun scripts/cli.ts dQw4w9WgXcQ --debug
  bun scripts/cli.ts dQw4w9WgXcQ --debug --debug-dir /tmp/yt-debug
  bun scripts/cli.ts dQw4w9WgXcQ --copy
`.trim();

function parseArgs(argv: string[]): {
	videoId: string | undefined;
	format: TranscriptConfig['format'];
	lang: string | undefined;
	metadata: boolean;
	help: boolean;
	copy: boolean;
	debug: boolean;
	debugDir: string;
} {
	const args = argv.slice(2); // strip "bun" and script path
	let videoId: string | undefined;
	let format: TranscriptConfig['format'] = 'text';
	let lang: string | undefined;
	let metadata = false;
	let help = false;
	let copy = false;
	let debug = false;
	let debugDir = './debug';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--help' || arg === '-h') {
			help = true;
		} else if (arg === '--copy' || arg === '-c') {
			copy = true;
		} else if (arg === '--debug') {
			debug = true;
		} else if (arg === '--debug-dir') {
			const value = args[++i];
			if (!value) {
				console.error('Error: --debug-dir requires a path');
				process.exit(1);
			}
			debugDir = value;
		} else if (arg === '--metadata') {
			metadata = true;
		} else if (arg === '--format') {
			const value = args[++i];
			if (!value || !['json', 'srt', 'vtt', 'text'].includes(value)) {
				console.error(
					`Error: --format must be one of: json, srt, vtt, text. Got: "${value ?? ''}"`,
				);
				process.exit(1);
			}
			format = value as TranscriptConfig['format'];
		} else if (arg === '--lang') {
			lang = args[++i];
			if (!lang) {
				console.error('Error: --lang requires a language code, e.g. "en"');
				process.exit(1);
			}
		} else if (!arg.startsWith('-')) {
			videoId = arg;
		} else {
			console.error(`Error: Unknown option "${arg}"`);
			console.error('Run with --help to see available options.');
			process.exit(1);
		}
	}

	return { videoId, format, lang, metadata, help, copy, debug, debugDir };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const { videoId, format, lang, metadata, help, copy, debug, debugDir } =
	parseArgs(process.argv);

if (help) {
	console.log(HELP);
	process.exit(0);
}

if (!videoId) {
	console.error('Error: A YouTube video ID or URL is required.\n');
	console.error(HELP);
	process.exit(1);
}

const config: TranscriptConfig = {
	format,
	...(lang ? { lang } : {}),
	...(metadata ? { includeMetadata: true } : {}),
	...(debug ? { debug: true, debugDir } : {}),
};

try {
	const result = await fetchTranscript(videoId, config);
	const output =
		typeof result === 'string' ? result : JSON.stringify(result, null, 2);
	process.stdout.write(output);
	// Ensure there's a trailing newline for clean terminal output
	process.stdout.write('\n');

	if (copy) {
		clipboardy.write(output);
		setTimeout(() => {
			console.error('\n✅ Copied to clipboard!');
			process.exit(0);
		}, 100);
	}
} catch (err) {
	const message = err instanceof Error ? err.message : String(err);
	console.error(`Error: ${message}`);
	process.exit(1);
}
