import { GM_getValue, GM_setValue } from '$';

const STORAGE_KEY = 'yt-transcript-copied-ids';

/**
 * Manages persistent transcript copy state.
 * Initialized once at boot and passed through the dependency chain.
 */
export class Storage {
	private copiedIds: Set<string> = new Set();

	/**
	 * Load persisted IDs from GM storage into memory.
	 * Must be called once before any polling or DOM injection starts.
	 */
	static async init(): Promise<Storage> {
		const storage = new Storage();
		await storage.load();
		return storage;
	}

	private async load(): Promise<void> {
		const raw = GM_getValue<string>(STORAGE_KEY, '[]');
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				this.copiedIds = new Set(
					parsed.filter((x): x is string => typeof x === 'string'),
				);
			}
		} catch {
			// Corrupted storage — start fresh
			this.copiedIds = new Set();
		}
	}

	/** Synchronous check after initialization. */
	hasCopied(videoId: string): boolean {
		return this.copiedIds.has(videoId);
	}

	/** Persist a newly copied video ID. */
	async markCopied(videoId: string): Promise<void> {
		this.copiedIds.add(videoId);
		await GM_setValue(STORAGE_KEY, JSON.stringify([...this.copiedIds]));
	}
}

// Legacy exports for backward compatibility during migration
let instance: Storage | null = null;

export async function initStorage(): Promise<void> {
	instance = await Storage.init();
}

export function hasCopied(videoId: string): boolean {
	if (!instance) throw new Error('Storage not initialized');
	return instance.hasCopied(videoId);
}

export async function markCopied(videoId: string): Promise<void> {
	if (!instance) throw new Error('Storage not initialized');
	await instance.markCopied(videoId);
}
