import { YoutubeTranscriptLoginRequiredError } from './errors';
import {
	buildTranscriptUrl,
	extractCaptionTracks,
	selectTrack,
} from './lib/caption-track';
import { DebugHandler } from './lib/debug';
import {
	jsonTranscriptToPlaintext,
	jsonTranscriptToSrt,
	jsonTranscriptToVtt,
	parseTranscriptXml,
} from './lib/transcript-parser';
import {
	fetchApiKey,
	fetchPlayerResponse,
	fetchTranscriptXml,
} from './lib/youtube-api';
import type {
	TranscriptConfig,
	TranscriptResponse,
	TranscriptWithMetadata,
} from './types';
import {
	extractVideoMetadata,
	metadataObjToYaml,
	retrieveVideoId,
} from './utils';

type TranscriptResult<C extends TranscriptConfig | undefined> = C extends {
	format: 'text';
	includeMetadata: true;
}
	? string
	: C extends { includeMetadata: true }
		? TranscriptWithMetadata
		: C extends { format: 'srt' | 'vtt' | 'text' }
			? string
			: TranscriptResponse[];

export async function fetchTranscript<
	C extends TranscriptConfig | undefined = undefined,
>(videoId: string, config?: C): Promise<TranscriptResult<C>>;

export async function fetchTranscript(
	videoId: string,
	config?: TranscriptConfig,
): Promise<TranscriptResponse[] | TranscriptWithMetadata | string> {
	const identifier = retrieveVideoId(videoId);
	const lang = config?.lang;

	// Initialize debug handler (no-op if debug disabled)
	const debug = new DebugHandler(
		identifier,
		config?.debugDir ?? './debug',
		config?.debug ?? false,
	);

	const { apiKey, html: watchPageHtml } = await fetchApiKey(identifier, config);
	const playerJson = await fetchPlayerResponse(identifier, apiKey, config);
	await debug.write('00-watch-page.html', watchPageHtml);
	await debug.writeJson('01-player-response.json', playerJson);

	// Check if YouTube is asking for login (rate limiting/bot detection)
	// Do this AFTER saving debug data so the response is captured
	if (playerJson?.playabilityStatus?.status === 'LOGIN_REQUIRED') {
		throw new YoutubeTranscriptLoginRequiredError(identifier);
	}

	const tracks = extractCaptionTracks(playerJson, identifier);
	await debug.writeJson('02-caption-tracks.json', {
		count: tracks.length,
		tracks,
	});

	const track = selectTrack(tracks, lang, identifier);
	await debug.writeJson('03-selected-track.json', track);

	const transcriptUrl = buildTranscriptUrl(track, identifier);
	const xml = await fetchTranscriptXml(transcriptUrl, identifier, config);
	await debug.write('04-transcript.xml', xml);

	const transcript = parseTranscriptXml(xml, identifier);
	await debug.writeJson('05-parsed-transcript.json', transcript);

	// Extract metadata early for debug output
	const metadata = config?.includeMetadata
		? extractVideoMetadata(playerJson, identifier)
		: undefined;

	if (metadata) {
		await debug.writeJson('06-metadata.json', metadata);
	}

	// Generate all formats for debug output
	const jsonOutput = transcript;
	const srtOutput = jsonTranscriptToSrt(transcript);
	const vttOutput = jsonTranscriptToVtt(transcript);
	const textOutput = jsonTranscriptToPlaintext(transcript);

	await debug.writeJson('08-output.json', jsonOutput);
	await debug.write('09-output.srt', srtOutput);
	await debug.write('10-output.vtt', vttOutput);
	await debug.write('11-output.txt', textOutput);

	if (metadata) {
		const yamlMetadata = metadataObjToYaml(metadata);
		await debug.write(
			'12-output-text-with-metadata.txt',
			`${yamlMetadata}\n\n${textOutput}`,
		);
		await debug.writeJson('13-output-json-with-metadata.json', {
			transcript: jsonOutput,
			metadata,
		});
	}

	if (debug.isEnabled()) {
		console.error(`📁 Debug files saved to: ${debug.getVideoDir()}`);
	}

	// Handle format conversion
	switch (config?.format) {
		case 'json': {
			if (config?.includeMetadata && metadata) {
				return { transcript, metadata };
			}
			return transcript;
		}
		case 'srt': {
			return srtOutput;
		}
		case 'vtt': {
			return vttOutput;
		}
		case 'text': {
			if (config?.includeMetadata && metadata) {
				const yamlMetadata = metadataObjToYaml(metadata);
				return `${yamlMetadata}\n\n${textOutput}`;
			}
			return textOutput;
		}
		default: {
			if (config?.includeMetadata && metadata) {
				return { transcript, metadata };
			}
			return transcript;
		}
	}
}

export * from './errors';
export { DebugHandler, DebugWriter } from './lib/debug';
export type {
	PlayerInspectionDebugResult,
	PlayerInspectionResult,
} from './lib/inspector';
export {
	inspectPlayerResponse,
	inspectPlayerResponseDebug,
} from './lib/inspector';
export type {
	FetchParams,
	TranscriptConfig,
	TranscriptResponse,
	TranscriptWithMetadata,
	VideoMetadata,
} from './types';
