import { writeClipboard } from './clipboard';
import type { Storage } from './storage';
import { fetchTranscript } from './transcript';

export type CopyResult = { ok: true } | { ok: false; reason: string };

/**
 * Pure orchestration of the transcript copy workflow.
 * Knows nothing about the DOM or button state — only the business logic sequence.
 * Decouples the user action from the UI layer.
 */
export async function copyTranscript(
	videoId: string,
	storage: Storage,
): Promise<CopyResult> {
	try {
		const transcript = await fetchTranscript(videoId);
		await writeClipboard(transcript);
		await storage.markCopied(videoId);
		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			reason: err instanceof Error ? err.message : 'Failed to copy transcript',
		};
	}
}
