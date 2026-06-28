import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface DebugConfig {
	enabled: boolean;
	baseDir: string;
}

/**
 * Manages debug file writes in an organized directory structure.
 * Structure: baseDir/videoId/runNumber/<filename>
 * Each run gets its own numbered folder (1, 2, 3, etc.)
 */
export class DebugWriter {
	private baseDir: string;
	private videoId: string;
	private runNumber: number = 0;
	private videoDir: string;
	private runDir: string = '';

	constructor(videoId: string, baseDir: string = 'debug') {
		this.videoId = videoId;
		this.baseDir = baseDir;
		this.videoDir = path.join(this.baseDir, this.videoId);
	}

	/**
	 * Get the next run number by finding the highest existing numbered folder
	 */
	private async getNextRunNumber(): Promise<number> {
		try {
			const entries = await readdir(this.videoDir, { withFileTypes: true });
			const folders = entries.filter((e) => e.isDirectory());
			const numbers = folders
				.map((f) => parseInt(f.name, 10))
				.filter((n) => !Number.isNaN(n));
			return Math.max(0, ...numbers) + 1;
		} catch {
			// Directory doesn't exist yet
			return 1;
		}
	}

	/**
	 * Ensure the run directory exists
	 */
	private async ensureDir(): Promise<void> {
		if (this.runNumber === 0) {
			this.runNumber = await this.getNextRunNumber();
		}
		this.runDir = path.join(this.videoDir, this.runNumber.toString());
		await mkdir(this.runDir, { recursive: true });
	}

	/**
	 * Get the full file path for a debug file
	 */
	private getFilePath(filename: string): string {
		return path.join(this.runDir, filename);
	}

	/**
	 * Write a debug file
	 */
	async write(filename: string, content: string | Buffer): Promise<string> {
		await this.ensureDir();
		const filePath = this.getFilePath(filename);
		await writeFile(filePath, content, 'utf-8');
		return filePath;
	}

	/**
	 * Write JSON debug file
	 */
	async writeJson(filename: string, data: unknown): Promise<string> {
		const jsonStr = JSON.stringify(data, null, 2);
		return this.write(filename, jsonStr);
	}

	/**
	 * Get the video directory path
	 */
	getVideoDir(): string {
		return this.videoDir;
	}

	/**
	 * Get the base debug directory
	 */
	getBaseDir(): string {
		return this.baseDir;
	}
}
/**
 * Debug handler that either writes files or does nothing based on enabled state.
 * This eliminates the need for `if (debugWriter)` checks throughout the code.
 */
export class DebugHandler {
	private writer: DebugWriter | null;

	constructor(videoId: string, baseDir?: string, enabled: boolean = false) {
		this.writer = enabled ? new DebugWriter(videoId, baseDir) : null;
	}

	/**
	 * Write a debug file if debug mode is enabled
	 */
	async write(filename: string, content: string | Buffer): Promise<void> {
		if (!this.writer) return;
		await this.writer.write(filename, content);
	}

	/**
	 * Write JSON debug file if debug mode is enabled
	 */
	async writeJson(filename: string, data: unknown): Promise<void> {
		if (!this.writer) return;
		await this.writer.writeJson(filename, data);
	}

	/**
	 * Get the video directory path (returns empty string if debug disabled)
	 */
	getVideoDir(): string {
		return this.writer?.getVideoDir() ?? '';
	}

	/**
	 * Check if debug mode is enabled
	 */
	isEnabled(): boolean {
		return this.writer !== null;
	}
}
