import { decodeHTML } from 'entities';
import { XMLParser } from 'fast-xml-parser';
import { YoutubeTranscriptNotAvailableError } from '../errors';
import type { TranscriptResponse } from '../types';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	tagValueProcessor: (_tag, val) => decodeHTML(val),
});

interface TranscriptTextNode {
	'#text': string | number;
	start: string;
	dur: string;
}

export function parseTranscriptXml(
	body: string,
	identifier: string,
): TranscriptResponse[] {
	const parsed = parser.parse(body);
	let items = parsed?.transcript?.text;

	if (!items) {
		throw new YoutubeTranscriptNotAvailableError(identifier);
	}

	// Normalize single item to array
	if (!Array.isArray(items)) {
		items = [items];
	}

	if (items.length === 0) {
		throw new YoutubeTranscriptNotAvailableError(identifier);
	}

	return items.map((m: TranscriptTextNode) => ({
		text: String(m['#text'] ?? ''),
		duration: parseFloat(m.dur),
		offset: parseFloat(m.start),
	}));
}

export function jsonTranscriptToPlaintext(
	transcript: TranscriptResponse[],
): string {
	return transcript
		.map((item) => item.text)
		.join('\n')
		.trim();
}

export function jsonTranscriptToSrt(transcript: TranscriptResponse[]): string {
	return transcript
		.map((item, index) => {
			const start = new Date(item.offset * 1000)
				.toISOString()
				.substring(11, 12)
				.replace('.', ',');
			const end = new Date((item.offset + item.duration) * 1000)
				.toISOString()
				.substring(11, 12)
				.replace('.', ',');
			return `${index + 1}\n${start} --> ${end}\n${item.text}\n`;
		})
		.join('\n');
}

export function jsonTranscriptToVtt(transcript: TranscriptResponse[]): string {
	const header = 'WEBVTT\n\n';
	const body = transcript
		.map((item) => {
			const start = new Date(item.offset * 1000)
				.toISOString()
				.substring(11, 12)
				.replace('.', '.');
			const end = new Date((item.offset + item.duration) * 1000)
				.toISOString()
				.substring(11, 12)
				.replace('.', '.');
			return `${start} --> ${end}\n${item.text}\n`;
		})
		.join('\n');
	return header + body;
}
