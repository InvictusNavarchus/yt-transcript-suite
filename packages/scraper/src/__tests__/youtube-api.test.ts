import nock from 'nock';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
	YoutubeTranscriptNotAvailableError,
	YoutubeTranscriptTooManyRequestError,
	YoutubeTranscriptVideoUnavailableError,
} from '../errors';
import {
	fetchApiKey,
	fetchPlayerResponse,
	fetchTranscriptXml,
} from '../lib/youtube-api';

const VIDEO_ID = 'TESTVIDEOID';
const API_KEY = 'test-key';

beforeAll(() => {
	nock.disableNetConnect();
});

afterEach(() => {
	nock.cleanAll();
});

afterAll(() => {
	nock.enableNetConnect();
});

describe('fetchApiKey', () => {
	it('should extract API key from watch page successfully (standard format)', async () => {
		nock('https://www.youtube.com')
			.get('/watch')
			.query({ v: VIDEO_ID })
			.reply(
				200,
				'<html><body>{"INNERTUBE_API_KEY":"extracted-api-key"}</body></html>',
			);

		const result = await fetchApiKey(VIDEO_ID);
		expect(result.apiKey).toBe('extracted-api-key');
		expect(result.html).toContain('extracted-api-key');
	});

	it('should extract API key from watch page successfully (escaped quotes format)', async () => {
		nock('https://www.youtube.com')
			.get('/watch')
			.query({ v: VIDEO_ID })
			.reply(
				200,
				'<html><body>INNERTUBE_API_KEY\\":\\"escaped-api-key\\"</body></html>',
			);

		const result = await fetchApiKey(VIDEO_ID);
		expect(result.apiKey).toBe('escaped-api-key');
	});

	it('should throw YoutubeTranscriptTooManyRequestError when page has recaptcha', async () => {
		nock('https://www.youtube.com')
			.get('/watch')
			.query({ v: VIDEO_ID })
			.reply(200, '<html><body><div class="g-recaptcha"></div></body></html>');

		await expect(fetchApiKey(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptTooManyRequestError,
		);
	});

	it('should throw YoutubeTranscriptVideoUnavailableError on non-OK status', async () => {
		nock('https://www.youtube.com')
			.get('/watch')
			.query({ v: VIDEO_ID })
			.reply(404);

		await expect(fetchApiKey(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptVideoUnavailableError,
		);
	});

	it('should throw YoutubeTranscriptNotAvailableError when API key is missing', async () => {
		nock('https://www.youtube.com')
			.get('/watch')
			.query({ v: VIDEO_ID })
			.reply(200, '<html><body>No key here</body></html>');

		await expect(fetchApiKey(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptNotAvailableError,
		);
	});
});

describe('fetchPlayerResponse', () => {
	it('should fetch player response with correct payload', async () => {
		const mockResponse = { playabilityStatus: { status: 'OK' } };

		nock('https://www.youtube.com')
			.post('/youtubei/v1/player')
			.query({ key: API_KEY })
			.reply((_uri, requestBody) => {
				const body =
					typeof requestBody === 'string'
						? JSON.parse(requestBody)
						: requestBody;
				if (
					body.videoId === VIDEO_ID &&
					body.context?.client?.clientName === 'ANDROID'
				) {
					return [200, mockResponse];
				}
				return [400, {}];
			});

		const result = await fetchPlayerResponse(VIDEO_ID, API_KEY);
		expect(result).toEqual(mockResponse);
	});

	it('should throw YoutubeTranscriptVideoUnavailableError on non-OK status', async () => {
		nock('https://www.youtube.com')
			.post('/youtubei/v1/player')
			.query({ key: API_KEY })
			.reply(500);

		await expect(fetchPlayerResponse(VIDEO_ID, API_KEY)).rejects.toThrow(
			YoutubeTranscriptVideoUnavailableError,
		);
	});
});

describe('fetchTranscriptXml', () => {
	const transcriptUrl =
		'https://www.youtube.com/api/timedtext?lang=en&v=TESTVIDEOID';

	it('should fetch XML content successfully', async () => {
		const xmlContent = '<transcript><text>Hello</text></transcript>';
		nock('https://www.youtube.com')
			.get('/api/timedtext')
			.query({ lang: 'en', v: VIDEO_ID })
			.reply(200, xmlContent);

		const result = await fetchTranscriptXml(transcriptUrl, VIDEO_ID);
		expect(result).toBe(xmlContent);
	});

	it('should throw YoutubeTranscriptTooManyRequestError on 429 status', async () => {
		nock('https://www.youtube.com')
			.get('/api/timedtext')
			.query({ lang: 'en', v: VIDEO_ID })
			.reply(429);

		await expect(fetchTranscriptXml(transcriptUrl, VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptTooManyRequestError,
		);
	});

	it('should throw YoutubeTranscriptNotAvailableError on other non-OK status codes', async () => {
		nock('https://www.youtube.com')
			.get('/api/timedtext')
			.query({ lang: 'en', v: VIDEO_ID })
			.reply(500);

		await expect(fetchTranscriptXml(transcriptUrl, VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptNotAvailableError,
		);
	});
});
