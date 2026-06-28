import './ui/button.css';
import { Storage } from './services/storage';
import { injectAll } from './utils/dom';

const POLL_INTERVAL_MS = 100;

/**
 * Application composition root.
 * Orchestrates dependency initialization and wiring explicitly.
 * All service dependencies flow through this function and are passed
 * through the call hierarchy, making the dependency graph visible.
 */
async function main(): Promise<void> {
	// Initialize storage first — this must happen before any DOM polling
	const storage = await Storage.init();

	// Pass the initialized storage to polling so all injected buttons have access to state
	setInterval(() => {
		injectAll(storage);
	}, POLL_INTERVAL_MS);
}

void main();
