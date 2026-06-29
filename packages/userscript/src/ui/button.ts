import { copyTranscript } from '../services/copyTranscript';
import type { Storage } from '../services/storage';
import {
	makeCheckIcon,
	makeClipboardIcon,
	makeErrorIcon,
	makeSpinnerIcon,
} from '../utils/icons';

export type ButtonState = 'idle' | 'fetching' | 'success' | 'copied' | 'error';

const SUCCESS_RESET_MS = 3000;

// ─── STATE MACHINE ────────────────────────────────────────────────────────────

export function setButtonState(
	btn: HTMLButtonElement,
	state: ButtonState,
	errorMsg?: string,
): void {
	const iconSlot = btn.querySelector<HTMLSpanElement>('.btn-icon-slot');
	const label = btn.querySelector<HTMLSpanElement>('.btn-label');
	const dot = btn.querySelector<HTMLSpanElement>('.btn-dot');

	// These elements are created in createButton — always present
	if (!iconSlot || !label || !dot) return;

	while (iconSlot.firstChild) iconSlot.removeChild(iconSlot.firstChild);
	btn.setAttribute('data-state', state);

	switch (state) {
		case 'idle':
			iconSlot.appendChild(makeClipboardIcon());
			label.textContent = 'Transcript';
			dot.style.display = 'none';
			btn.title = 'Copy transcript';
			break;

		case 'fetching':
			iconSlot.appendChild(makeSpinnerIcon());
			label.textContent = 'Fetching…';
			dot.style.display = 'none';
			btn.title = 'Fetching transcript…';
			break;

		case 'success':
			iconSlot.appendChild(makeCheckIcon());
			label.textContent = 'Copied!';
			dot.style.display = 'none';
			btn.title = 'Transcript copied to clipboard!';
			break;

		case 'copied':
			iconSlot.appendChild(makeClipboardIcon());
			label.textContent = 'Transcript';
			dot.style.display = 'inline-block';
			btn.title = 'Transcript already copied — click to copy again';
			break;

		case 'error':
			iconSlot.appendChild(makeErrorIcon());
			label.textContent = errorMsg ?? 'Error';
			dot.style.display = 'none';
			btn.title = errorMsg ?? 'Failed to fetch transcript';
			break;
	}
}

// ─── CLICK HANDLER ────────────────────────────────────────────────────────────

async function handleClick(
	btn: HTMLButtonElement,
	videoId: string,
	storage: Storage,
): Promise<void> {
	if (btn.getAttribute('data-state') === 'fetching') return;

	setButtonState(btn, 'fetching');

	const result = await copyTranscript(videoId, storage);

	if (result.ok) {
		setButtonState(btn, 'success');
		setTimeout(() => {
			setButtonState(btn, 'copied');
		}, SUCCESS_RESET_MS);
	} else {
		setButtonState(btn, 'error', result.reason);
		setTimeout(() => {
			setButtonState(btn, 'idle');
		}, SUCCESS_RESET_MS);
	}
}

// ─── FACTORY ─────────────────────────────────────────────────────────────────

export function createButton(
	videoId: string,
	storage: Storage,
	initialState: ButtonState = 'idle',
): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.className = 'yt-transcript-btn';
	btn.type = 'button';
	btn.setAttribute('data-video-id', videoId);

	const dot = document.createElement('span');
	dot.className = 'btn-dot';

	const iconSlot = document.createElement('span');
	iconSlot.className = 'btn-icon-slot';
	iconSlot.style.cssText = 'display:inline-flex;align-items:center;';

	const label = document.createElement('span');
	label.className = 'btn-label';

	btn.appendChild(dot);
	btn.appendChild(iconSlot);
	btn.appendChild(label);

	btn.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		const currentVideoId = btn.getAttribute('data-video-id');
		if (currentVideoId) {
			void handleClick(btn, currentVideoId, storage);
		}
	});

	setButtonState(btn, initialState);

	return btn;
}
