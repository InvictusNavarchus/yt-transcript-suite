import fs from 'node:fs';
import path from 'node:path';
import nock from 'nock';
import { vi } from 'vitest';
import {
	YoutubeTranscriptDisabledError,
	YoutubeTranscriptInvalidVideoIdError,
	YoutubeTranscriptNotAvailableError,
	YoutubeTranscriptNotAvailableLanguageError,
	YoutubeTranscriptTooManyRequestError,
	YoutubeTranscriptVideoUnavailableError,
} from '../errors';
import { fetchTranscript } from '../index';
import { retrieveVideoId } from '../utils';

const fixturesDir = path.join(process.cwd(), 'src', '__tests__', 'fixtures');

const VIDEO_ID = 'TESTVIDEOID';
const API_KEY = 'test-key';

const loadFixture = (name: string): string =>
	fs.readFileSync(path.join(fixturesDir, name), 'utf8');
const loadJsonFixture = (name: string): object =>
	JSON.parse(loadFixture(name)) as object;

const mockWatchPage = (protocol = 'https', body?: string) =>
	nock(`${protocol}://www.youtube.com`)
		.get('/watch')
		.query({ v: VIDEO_ID })
		.reply(200, body ?? loadFixture('watch.html'));

const mockPlayer = (body: object, protocol = 'https') =>
	nock(`${protocol}://www.youtube.com`)
		.post('/youtubei/v1/player')
		.query({ key: API_KEY })
		.reply(200, body);

const mockTranscript = (protocol = 'https', fixture = 'transcript.xml') =>
	nock(`${protocol}://www.youtube.com`)
		.get('/api/timedtext')
		.query({ lang: 'en', v: VIDEO_ID })
		.reply(200, loadFixture(fixture));

const originalFetch = global.fetch;

beforeAll(() => {
	if (!global.fetch) {
		throw new Error('global fetch is not available in this test environment');
	}
	nock.disableNetConnect();
});

afterEach(() => {
	nock.cleanAll();
	vi.restoreAllMocks();
});

afterAll(() => {
	nock.enableNetConnect();
	global.fetch = originalFetch;
});

describe('fetchTranscript', () => {
	it('should fetch transcript successfully', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-success.json'));
		mockTranscript();

		const transcript = await fetchTranscript(VIDEO_ID);

		expect(transcript).toEqual([
			{ text: 'Hello world', duration: 1.5, offset: 0 },
			{ text: 'Second line', duration: 2.0, offset: 1.5 },
		]);
	});

	it('should decode XML entities in transcript text', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-success.json'));
		mockTranscript('https', 'transcript-entities.xml');

		const transcript = await fetchTranscript(VIDEO_ID);

		expect(transcript).toEqual([
			{ text: 'rock & roll', duration: 1.5, offset: 0 },
			{ text: 'it\'s a "test"', duration: 2.0, offset: 1.5 },
		]);
	});

	it('should throw YoutubeTranscriptInvalidVideoIdError when video is invalid', async () => {
		const videoId = 'invalidVideoId';
		await expect(fetchTranscript(videoId)).rejects.toThrow(
			YoutubeTranscriptInvalidVideoIdError,
		);
	});

	it('should throw YoutubeTranscriptDisabledError when transcript is disabled', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-disabled.json'));

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptDisabledError,
		);
	});

	it('should throw YoutubeTranscriptNotAvailableLanguageError when transcript is not available in the specified language', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-success.json'));

		await expect(fetchTranscript(VIDEO_ID, { lang: 'fr' })).rejects.toThrow(
			YoutubeTranscriptNotAvailableLanguageError,
		);
	});

	it('should use custom playerFetch when provided', async () => {
		const mockPlayerFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					captions: {
						playerCaptionsTracklistRenderer: {
							captionTracks: [
								{
									baseUrl: 'https://example.com/transcript',
									languageCode: 'en',
								},
							],
						},
					},
					playabilityStatus: { status: 'OK' },
				}),
		});

		const mockVideoFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve('{"INNERTUBE_API_KEY":"test-key"}'),
		});

		const mockTranscriptFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () =>
				Promise.resolve(
					'<transcript><text start="0" dur="1.5">Hello world</text></transcript>',
				),
		});

		const result = await fetchTranscript('dQw4w9WgXcQ', {
			playerFetch: mockPlayerFetch,
			videoFetch: mockVideoFetch,
			transcriptFetch: mockTranscriptFetch,
		});

		expect(mockPlayerFetch).toHaveBeenCalledWith({
			url: expect.stringContaining('youtubei/v1/player'),
			method: 'POST',
			lang: undefined,
			userAgent: expect.any(String),
			headers: { 'Content-Type': 'application/json' },
			body: expect.stringContaining('"videoId":"dQw4w9WgXcQ"'),
		});
		expect(result).toEqual([{ text: 'Hello world', duration: 1.5, offset: 0 }]);
	});

	it('should use custom videoFetch and transcriptFetch when provided', async () => {
		const mockVideoFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve('{"INNERTUBE_API_KEY":"custom-key"}'),
		});

		const mockTranscriptFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () =>
				Promise.resolve(
					'<transcript><text start="0" dur="2.0">Custom transcript</text></transcript>',
				),
		});

		nock('https://www.youtube.com')
			.post('/youtubei/v1/player')
			.query({ key: 'custom-key' })
			.reply(200, {
				captions: {
					playerCaptionsTracklistRenderer: {
						captionTracks: [
							{ baseUrl: 'https://example.com/transcript', languageCode: 'fr' },
						],
					},
				},
				playabilityStatus: { status: 'OK' },
			});

		const result = await fetchTranscript('dQw4w9WgXcQ', {
			videoFetch: mockVideoFetch,
			transcriptFetch: mockTranscriptFetch,
			lang: 'fr',
			userAgent: 'CustomAgent/1.0',
		});

		expect(mockVideoFetch).toHaveBeenCalledWith({
			url: expect.stringContaining('youtube.com/watch'),
			lang: 'fr',
			userAgent: 'CustomAgent/1.0',
		});
		expect(mockTranscriptFetch).toHaveBeenCalledWith({
			url: expect.stringContaining('example.com/transcript'),
			lang: 'fr',
			userAgent: 'CustomAgent/1.0',
		});
		expect(result).toEqual([
			{ text: 'Custom transcript', duration: 2.0, offset: 0 },
		]);
	});
});

describe('retrieveVideoId', () => {
	it('should return the video ID from a valid YouTube URL', () => {
		const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
	});

	it('should return the video ID from a short YouTube URL', () => {
		const url = 'https://youtu.be/dQw4w9WgXcQ';
		expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
	});

	it('should return the video ID from an embedded YouTube URL', () => {
		const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
		expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
	});

	it('should return the video ID from a live YouTube URL', () => {
		const url = 'https://www.youtube.com/live/dQw4w9WgXcQ';
		expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
	});

	it('should return the video ID from a YouTube Shorts URL', () => {
		const url = 'https://youtube.com/shorts/dQw4w9WgXcQ';
		expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
	});

	it('should throw an error for an invalid YouTube URL', () => {
		const url = 'https://www.youtube.com/watch?v=invalid';
		expect(() => retrieveVideoId(url)).toThrow(
			YoutubeTranscriptInvalidVideoIdError,
		);
	});

	it('should throw an error for a non-YouTube URL', () => {
		const url = 'https://www.google.com';
		expect(() => retrieveVideoId(url)).toThrow(
			YoutubeTranscriptInvalidVideoIdError,
		);
	});

	it('should reject 11-character strings with special characters', () => {
		expect(() => retrieveVideoId('../.././../.')).toThrow(
			YoutubeTranscriptInvalidVideoIdError,
		);
		expect(() => retrieveVideoId('hello world')).toThrow(
			YoutubeTranscriptInvalidVideoIdError,
		);
	});
});

describe('Error Handling', () => {
	it('should throw YoutubeTranscriptTooManyRequestError when too many requests are made', async () => {
		mockWatchPage('https', loadFixture('watch-recaptcha.html'));

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptTooManyRequestError,
		);
	});

	it('should throw YoutubeTranscriptNotAvailableError when no transcript is available', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-not-available.json'));

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptNotAvailableError,
		);
	});

	it('should throw YoutubeTranscriptVideoUnavailableError when watch page returns non-OK', async () => {
		nock('https://www.youtube.com')
			.get('/watch')
			.query({ v: VIDEO_ID })
			.reply(404);

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptVideoUnavailableError,
		);
	});

	it('should throw YoutubeTranscriptVideoUnavailableError when player endpoint returns non-OK', async () => {
		mockWatchPage();
		nock('https://www.youtube.com')
			.post('/youtubei/v1/player')
			.query({ key: API_KEY })
			.reply(500);

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptVideoUnavailableError,
		);
	});

	it('should throw YoutubeTranscriptTooManyRequestError when transcript fetch returns 429', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-success.json'));
		nock('https://www.youtube.com')
			.get('/api/timedtext')
			.query({ lang: 'en', v: VIDEO_ID })
			.reply(429);

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptTooManyRequestError,
		);
	});

	it('should throw YoutubeTranscriptNotAvailableError when transcript fetch returns non-OK non-429', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-success.json'));
		nock('https://www.youtube.com')
			.get('/api/timedtext')
			.query({ lang: 'en', v: VIDEO_ID })
			.reply(500);

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptNotAvailableError,
		);
	});

	it('should throw YoutubeTranscriptNotAvailableError when transcript body has no matches', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-success.json'));
		nock('https://www.youtube.com')
			.get('/api/timedtext')
			.query({ lang: 'en', v: VIDEO_ID })
			.reply(200, '<transcript></transcript>');

		await expect(fetchTranscript(VIDEO_ID)).rejects.toThrow(
			YoutubeTranscriptNotAvailableError,
		);
	});

	it('should include videoId on error instances', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-not-available.json'));

		try {
			await fetchTranscript(VIDEO_ID);
		} catch (error) {
			expect(error).toBeInstanceOf(YoutubeTranscriptNotAvailableError);
			expect((error as YoutubeTranscriptNotAvailableError).videoId).toBe(
				VIDEO_ID,
			);
		}
	});

	it('should include lang and availableLangs on language error', async () => {
		mockWatchPage();
		mockPlayer(loadJsonFixture('player-success.json'));

		try {
			await fetchTranscript(VIDEO_ID, { lang: 'fr' });
		} catch (error) {
			expect(error).toBeInstanceOf(YoutubeTranscriptNotAvailableLanguageError);
			const langError = error as YoutubeTranscriptNotAvailableLanguageError;
			expect(langError.lang).toBe('fr');
			expect(langError.availableLangs).toEqual(['en']);
			expect(langError.videoId).toBe(VIDEO_ID);
		}
	});
});
