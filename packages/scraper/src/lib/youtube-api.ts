import { DEFAULT_USER_AGENT } from '../constants';
import {
	YoutubeTranscriptNotAvailableError,
	YoutubeTranscriptTooManyRequestError,
	YoutubeTranscriptVideoUnavailableError,
} from '../errors';
import type {
	FetchParams,
	TranscriptConfig,
	YouTubePlayerResponse,
} from '../types';
import { defaultFetch } from '../utils';

const BASE_URL = 'https://www.youtube.com';

export async function fetchApiKey(
	identifier: string,
	config?: TranscriptConfig,
): Promise<{ apiKey: string; html: string }> {
	const lang = config?.lang;
	const userAgent = config?.userAgent ?? DEFAULT_USER_AGENT;
	const watchUrl = `${BASE_URL}/watch?v=${identifier}`;

	const videoPageResponse = config?.videoFetch
		? await config.videoFetch({ url: watchUrl, lang, userAgent })
		: await defaultFetch({ url: watchUrl, lang, userAgent });

	if (!videoPageResponse.ok) {
		throw new YoutubeTranscriptVideoUnavailableError(identifier);
	}

	const videoPageBody = await videoPageResponse.text();

	if (videoPageBody.includes('class="g-recaptcha"')) {
		throw new YoutubeTranscriptTooManyRequestError();
	}

	const apiKeyMatch =
		videoPageBody.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ||
		videoPageBody.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/);

	if (!apiKeyMatch) {
		throw new YoutubeTranscriptNotAvailableError(identifier);
	}

	return { apiKey: apiKeyMatch[1], html: videoPageBody };
}

export async function fetchPlayerResponse(
	identifier: string,
	apiKey: string,
	config?: TranscriptConfig,
): Promise<YouTubePlayerResponse> {
	const lang = config?.lang;
	const userAgent = config?.userAgent ?? DEFAULT_USER_AGENT;
	const playerEndpoint = `${BASE_URL}/youtubei/v1/player?key=${apiKey}`;

	const playerBody = {
		context: {
			client: {
				clientName: 'ANDROID',
				clientVersion: '20.10.38',
			},
		},
		videoId: identifier,
	};

	const playerFetchParams: FetchParams = {
		url: playerEndpoint,
		method: 'POST',
		lang,
		userAgent,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(playerBody),
	};

	const playerRes = config?.playerFetch
		? await config.playerFetch(playerFetchParams)
		: await defaultFetch(playerFetchParams);

	if (!playerRes.ok) {
		throw new YoutubeTranscriptVideoUnavailableError(identifier);
	}

	const playerJson = (await playerRes.json()) as YouTubePlayerResponse;

	return playerJson;
}

export async function fetchTranscriptXml(
	transcriptUrl: string,
	identifier: string,
	config?: TranscriptConfig,
): Promise<string> {
	const lang = config?.lang;
	const userAgent = config?.userAgent ?? DEFAULT_USER_AGENT;

	const transcriptResponse = config?.transcriptFetch
		? await config.transcriptFetch({ url: transcriptUrl, lang, userAgent })
		: await defaultFetch({ url: transcriptUrl, lang, userAgent });

	if (!transcriptResponse.ok) {
		if (transcriptResponse.status === 429) {
			throw new YoutubeTranscriptTooManyRequestError();
		}
		throw new YoutubeTranscriptNotAvailableError(identifier);
	}

	return transcriptResponse.text();
}
