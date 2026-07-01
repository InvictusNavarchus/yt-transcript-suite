import { vi } from 'vitest';
import { YoutubeTranscriptInvalidVideoIdError } from '../errors';
import {
	decodeXmlEntities,
	defaultFetch,
	extractVideoMetadata,
	metadataObjToYaml,
	retrieveVideoId,
} from '../utils';

describe('defaultFetch', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi
			.spyOn(global, 'fetch')
			.mockResolvedValue({ ok: true } as Response);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should make GET request by default', async () => {
		const mockResponse = { ok: true, status: 200 };
		fetchSpy.mockResolvedValue(mockResponse);

		await defaultFetch({
			url: 'https://example.com',
			lang: 'en',
			userAgent: 'Test Agent',
		});

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com', {
			method: 'GET',
			headers: {
				'User-Agent': 'Test Agent',
				'Accept-Language': 'en',
			},
		});
	});

	it('should make POST request with body when specified', async () => {
		const mockResponse = { ok: true, status: 200 };
		fetchSpy.mockResolvedValue(mockResponse);

		const testBody = JSON.stringify({ test: 'data' });
		await defaultFetch({
			url: 'https://api.example.com',
			method: 'POST',
			body: testBody,
			headers: { 'Content-Type': 'application/json' },
			userAgent: 'Test Agent',
		});

		expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com', {
			method: 'POST',
			headers: {
				'User-Agent': 'Test Agent',
				'Content-Type': 'application/json',
			},
			body: testBody,
		});
	});

	it('should merge custom headers with default headers', async () => {
		const mockResponse = { ok: true, status: 200 };
		fetchSpy.mockResolvedValue(mockResponse);

		await defaultFetch({
			url: 'https://example.com',
			lang: 'fr',
			userAgent: 'Custom Agent',
			headers: {
				'Custom-Header': 'custom-value',
				'Another-Header': 'another-value',
			},
		});

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com', {
			method: 'GET',
			headers: {
				'User-Agent': 'Custom Agent',
				'Accept-Language': 'fr',
				'Custom-Header': 'custom-value',
				'Another-Header': 'another-value',
			},
		});
	});

	it('should not include Accept-Language header when lang is not provided', async () => {
		const mockResponse = { ok: true, status: 200 };
		fetchSpy.mockResolvedValue(mockResponse);

		await defaultFetch({
			url: 'https://example.com',
			userAgent: 'Test Agent',
		});

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com', {
			method: 'GET',
			headers: {
				'User-Agent': 'Test Agent',
			},
		});
	});

	it('should use default user agent when not provided', async () => {
		const mockResponse = { ok: true, status: 200 };
		fetchSpy.mockResolvedValue(mockResponse);

		await defaultFetch({
			url: 'https://example.com',
		});

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com', {
			method: 'GET',
			headers: {
				'User-Agent': expect.stringContaining('Mozilla'),
			},
		});
	});

	it('should not include body for GET requests even if provided', async () => {
		const mockResponse = { ok: true, status: 200 };
		fetchSpy.mockResolvedValue(mockResponse);

		await defaultFetch({
			url: 'https://example.com',
			method: 'GET',
			body: 'should not be included',
		});

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com', {
			method: 'GET',
			headers: {
				'User-Agent': expect.any(String),
			},
		});
	});
});

describe('retrieveVideoId', () => {
	it('should return video ID when given 11-character string', () => {
		expect(retrieveVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from standard YouTube URL', () => {
		expect(retrieveVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
			'dQw4w9WgXcQ',
		);
	});

	it('should extract video ID from YouTube short URL', () => {
		expect(retrieveVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('should throw error for invalid video ID', () => {
		expect(() => retrieveVideoId('invalid')).toThrow(
			YoutubeTranscriptInvalidVideoIdError,
		);
	});

	it('should throw error for non-YouTube URL', () => {
		expect(() => retrieveVideoId('https://example.com')).toThrow(
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
		expect(() => retrieveVideoId('abc!@#$%^&*')).toThrow(
			YoutubeTranscriptInvalidVideoIdError,
		);
	});

	it('should accept valid 11-character video IDs with hyphens and underscores', () => {
		expect(retrieveVideoId('abc_def-123')).toBe('abc_def-123');
		expect(retrieveVideoId('___________')).toBe('___________');
		expect(retrieveVideoId('-----------')).toBe('-----------');
	});
});

describe('decodeXmlEntities', () => {
	it('should decode &amp; to &', () => {
		expect(decodeXmlEntities('rock &amp; roll')).toBe('rock & roll');
	});

	it('should decode &#39; and &apos; to single quote', () => {
		expect(decodeXmlEntities('it&#39;s')).toBe("it's");
		expect(decodeXmlEntities('it&apos;s')).toBe("it's");
	});

	it('should decode &quot; to double quote', () => {
		expect(decodeXmlEntities('a &quot;test&quot;')).toBe('a "test"');
	});

	it('should decode &lt; and &gt;', () => {
		expect(decodeXmlEntities('&lt;tag&gt;')).toBe('<tag>');
	});

	it('should handle multiple entities in one string', () => {
		expect(decodeXmlEntities('A &amp; B &lt; C &gt; D')).toBe('A & B < C > D');
	});

	it('should return plain text unchanged', () => {
		expect(decodeXmlEntities('Hello world')).toBe('Hello world');
	});
});

describe('extractVideoMetadata', () => {
	it('should extract correct metadata from player response', () => {
		const mockPlayerResponse = {
			videoDetails: {
				title: 'Test Title',
				lengthSeconds: '120',
				author: 'Test Author',
				channelId: 'UC12345',
				keywords: ['tag1', 'tag2'],
			},
			microformat: {
				description: {
					simpleText: 'Test Description',
				},
			},
			playabilityStatus: { status: 'OK' },
		};

		const metadata = extractVideoMetadata(
			mockPlayerResponse as any,
			'dQw4w9WgXcQ',
		);

		expect(metadata).toEqual({
			title: 'Test Title',
			description: 'Test Description',
			durationSeconds: 120,
			author: 'Test Author',
			channelId: 'UC12345',
			keywords: ['tag1', 'tag2'],
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			videoId: 'dQw4w9WgXcQ',
		});
	});

	it('should handle missing microformat and lengthSeconds gracefully', () => {
		const mockPlayerResponse = {
			videoDetails: {
				title: 'Test Title',
				author: 'Test Author',
				channelId: 'UC12345',
			},
			playabilityStatus: { status: 'OK' },
		};

		const metadata = extractVideoMetadata(
			mockPlayerResponse as any,
			'dQw4w9WgXcQ',
		);

		expect(metadata).toEqual({
			title: 'Test Title',
			description: undefined,
			durationSeconds: undefined,
			author: 'Test Author',
			channelId: 'UC12345',
			keywords: undefined,
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			videoId: 'dQw4w9WgXcQ',
		});
	});
});

describe('metadataObjToYaml', () => {
	it('should format simple metadata object to YAML', () => {
		const metadata = {
			title: 'Test Title',
			author: 'Test Author',
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			videoId: 'dQw4w9WgXcQ',
		};

		const yaml = metadataObjToYaml(metadata);
		expect(yaml).toBe(
			'---\ntitle: Test Title\nauthor: Test Author\nurl: https://www.youtube.com/watch?v=dQw4w9WgXcQ\nvideoId: dQw4w9WgXcQ\n---',
		);
	});

	it('should format metadata with arrays to YAML', () => {
		const metadata = {
			title: 'Test Title',
			keywords: ['tag1', 'tag2'],
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			videoId: 'dQw4w9WgXcQ',
		};

		const yaml = metadataObjToYaml(metadata);
		expect(yaml).toBe(
			'---\ntitle: Test Title\nkeywords:\n  - tag1\n  - tag2\nurl: https://www.youtube.com/watch?v=dQw4w9WgXcQ\nvideoId: dQw4w9WgXcQ\n---',
		);
	});
});
