import { describe, expect, it } from 'vitest';
import { YoutubeTranscriptNotAvailableError } from '../errors';
import {
	jsonTranscriptToPlaintext,
	jsonTranscriptToSrt,
	jsonTranscriptToVtt,
	parseTranscriptXml,
} from '../lib/transcript-parser';

describe('transcript-parser', () => {
	const mockTranscript = [
		{ text: 'Hello world', duration: 1.5, offset: 0 },
		{ text: 'Second line', duration: 2.0, offset: 1.5 },
	];

	describe('jsonTranscriptToPlaintext', () => {
		it('should convert json transcript to plaintext', () => {
			const text = jsonTranscriptToPlaintext(mockTranscript);
			expect(text).toBe('Hello world\nSecond line');
		});

		it('should return empty string for empty transcript', () => {
			const text = jsonTranscriptToPlaintext([]);
			expect(text).toBe('');
		});
	});

	describe('jsonTranscriptToSrt', () => {
		it('should convert json transcript to correct SRT format', () => {
			const srt = jsonTranscriptToSrt(mockTranscript);
			expect(srt).toBe(
				'1\n00:00:00,000 --> 00:00:01,500\nHello world\n\n2\n00:00:01,500 --> 00:00:03,500\nSecond line\n',
			);
		});

		it('should handle decimal timestamps correctly', () => {
			const transcript = [
				{ text: 'Test text', duration: 0.123, offset: 3600.456 },
			];
			const srt = jsonTranscriptToSrt(transcript);
			expect(srt).toBe('1\n01:00:00,456 --> 01:00:00,579\nTest text\n');
		});
	});

	describe('jsonTranscriptToVtt', () => {
		it('should convert json transcript to correct VTT format', () => {
			const vtt = jsonTranscriptToVtt(mockTranscript);
			expect(vtt).toBe(
				'WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nHello world\n\n00:00:01.500 --> 00:00:03.500\nSecond line\n',
			);
		});

		it('should handle decimal timestamps correctly', () => {
			const transcript = [
				{ text: 'Test text', duration: 0.123, offset: 3600.456 },
			];
			const vtt = jsonTranscriptToVtt(transcript);
			expect(vtt).toBe('WEBVTT\n\n01:00:00.456 --> 01:00:00.579\nTest text\n');
		});
	});

	describe('parseTranscriptXml', () => {
		it('should parse valid XML to JSON transcript', () => {
			const xml = `
				<transcript>
					<text start="0" dur="1.5">Hello world</text>
					<text start="1.5" dur="2">Second line</text>
				</transcript>
			`;
			const result = parseTranscriptXml(xml, 'test-video-id');
			expect(result).toEqual(mockTranscript);
		});

		it('should throw error when xml is missing text tags', () => {
			const xml = `<transcript></transcript>`;
			expect(() => parseTranscriptXml(xml, 'test-video-id')).toThrow(
				YoutubeTranscriptNotAvailableError,
			);
		});

		it('should throw error when xml is completely empty', () => {
			expect(() => parseTranscriptXml('', 'test-video-id')).toThrow(
				YoutubeTranscriptNotAvailableError,
			);
		});

		it('should parse single text tag as array', () => {
			const xml = `
				<transcript>
					<text start="0" dur="1.5">Hello world</text>
				</transcript>
			`;
			const result = parseTranscriptXml(xml, 'test-video-id');
			expect(result).toEqual([
				{ text: 'Hello world', duration: 1.5, offset: 0 },
			]);
		});
	});
});
