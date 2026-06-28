import { GM_xmlhttpRequest } from '$';

const TRANSCRIPT_ENDPOINT = 'http://localhost:3456/transcript';
const API_KEY = import.meta.env.VITE_TRANSCRIPT_API_KEY as string;

interface TranscriptResponse {
	transcript: string;
}

function isTranscriptResponse(data: unknown): data is TranscriptResponse {
	return (
		typeof data === 'object' &&
		data !== null &&
		'transcript' in data &&
		typeof (data as Record<string, unknown>).transcript === 'string'
	);
}

export function fetchTranscript(videoId: string): Promise<string> {
	const url = `${TRANSCRIPT_ENDPOINT}?videoId=${encodeURIComponent(videoId)}`;

	return new Promise((resolve, reject) => {
		GM_xmlhttpRequest({
			method: 'GET',
			url,
			headers: { 'x-api-key': API_KEY },
			onload(response) {
				try {
					const data: unknown = JSON.parse(response.responseText);
					if (isTranscriptResponse(data)) {
						resolve(data.transcript);
					} else {
						reject(new Error('Invalid response'));
					}
				} catch {
					reject(new Error('Parse error'));
				}
			},
			onerror() {
				reject(new Error('Network error'));
			},
			ontimeout() {
				reject(new Error('Timeout'));
			},
		});
	});
}
