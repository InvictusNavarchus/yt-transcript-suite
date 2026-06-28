import { DEFAULT_USER_AGENT, RE_YOUTUBE } from './constants';
import { YoutubeTranscriptInvalidVideoIdError } from './errors';
import type {
	FetchParams,
	VideoMetadata,
	YouTubePlayerResponse,
} from './types';

const RE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

const XML_ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&apos;': "'",
};

const RE_XML_ENTITY = /&(?:amp|lt|gt|quot|apos|#39);/g;

export function decodeXmlEntities(text: string): string {
	return text.replace(RE_XML_ENTITY, (match) => XML_ENTITIES[match] ?? match);
}

export function retrieveVideoId(videoId: string): string {
	if (RE_VIDEO_ID.test(videoId)) {
		return videoId;
	}
	const matchId = videoId.match(RE_YOUTUBE);
	if (matchId?.length) {
		return matchId[1];
	}
	throw new YoutubeTranscriptInvalidVideoIdError();
}

export async function defaultFetch(params: FetchParams): Promise<Response> {
	const { url, lang, userAgent, method = 'GET', body, headers = {} } = params;

	const fetchHeaders: Record<string, string> = {
		'User-Agent': userAgent || DEFAULT_USER_AGENT,
		...(lang && { 'Accept-Language': lang }),
		...headers,
	};

	const fetchOptions: RequestInit = {
		method,
		headers: fetchHeaders,
	};

	if (body && method === 'POST') {
		fetchOptions.body = body;
	}

	return fetch(url, fetchOptions);
}

/**
 * Extract video metadata from YouTube player response
 * @param playerResponse - The player response from YouTube's Innertube API
 * @param videoId - The video ID
 * @returns Video metadata object with title, description, author, etc.
 */
export function extractVideoMetadata(
	playerResponse: YouTubePlayerResponse,
	videoId: string,
): VideoMetadata {
	// Try to get videoDetails from the response
	const videoDetails = playerResponse.videoDetails;
	const microformat = playerResponse.microformat;

	return {
		title: videoDetails?.title,
		description: microformat?.description?.simpleText,
		durationSeconds: videoDetails?.lengthSeconds
			? parseInt(videoDetails.lengthSeconds, 10)
			: undefined,
		author: videoDetails?.author,
		channelId: videoDetails?.channelId,
		keywords: videoDetails?.keywords,
		url: `https://www.youtube.com/watch?v=${videoId}`,
		videoId,
	};
}

export function metadataObjToYaml(metadata: VideoMetadata): string {
	const yamlLines = ['---'];
	for (const [key, value] of Object.entries(metadata)) {
		if (value !== undefined) {
			if (Array.isArray(value)) {
				yamlLines.push(`${key}:`);
				value.forEach((item) => {
					yamlLines.push(`  - ${item}`);
				});
			} else {
				yamlLines.push(`${key}: ${value}`);
			}
		}
	}
	yamlLines.push('---');
	return yamlLines.join('\n');
}
