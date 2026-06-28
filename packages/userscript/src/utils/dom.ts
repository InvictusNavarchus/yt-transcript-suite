import type { Storage } from '../services/storage';
import { createButton } from '../ui/button';

const INJECTED_ATTR = 'data-transcript-btn-injected';

// ─── SHARED ───────────────────────────────────────────────────────────────────

export function extractVideoId(card: Element): string | null {
	const anchors = card.querySelectorAll('a[href*="/watch?v="]');
	for (const a of anchors) {
		try {
			const url = new URL(
				(a as HTMLAnchorElement).href,
				'https://www.youtube.com',
			);
			const videoId = url.searchParams.get('v');
			if (videoId) return videoId;
		} catch {
			// skip malformed hrefs
		}
	}

	const el = card.querySelector('[class*="content-id-"]');
	if (el) {
		const match = el.className.match(/content-id-([A-Za-z0-9_-]{11})/);
		if (match?.[1]) return match[1];
	}

	return null;
}

function isWatchPage(): boolean {
	return window.location.pathname === '/watch';
}

// ─── WATCH PAGE (/watch — sidebar recommendations) ────────────────────────────

const WATCH_TEXT_CONTAINER = '.ytLockupMetadataViewModelTextContainer';

function injectWatchPage(metadataVM: Element, btn: HTMLButtonElement): boolean {
	const textContainer = metadataVM.querySelector(WATCH_TEXT_CONTAINER);
	if (!textContainer) return false;

	btn.classList.add('yt-transcript-btn--stacked');
	textContainer.appendChild(btn);
	return true;
}

// ─── FEED / HOMEPAGE (yt-lockup-view-model outside /watch) ───────────────────

const FEED_MENU_BUTTON = '.yt-lockup-metadata-view-model__menu-button';

function injectFeedCard(metadataVM: Element, btn: HTMLButtonElement): void {
	const menuBtn = metadataVM.querySelector(FEED_MENU_BUTTON);
	if (menuBtn) {
		metadataVM.insertBefore(btn, menuBtn);
	} else {
		metadataVM.appendChild(btn);
	}
}

// ─── SEARCH RESULTS (ytd-video-renderer) ─────────────────────────────────────

const SEARCH_BUTTONS_SLOT = '#buttons';

function injectSearchCard(card: Element, btn: HTMLButtonElement): boolean {
	const buttonsSlot = card.querySelector(SEARCH_BUTTONS_SLOT);
	if (!buttonsSlot) return false;

	buttonsSlot.appendChild(btn);
	return true;
}

// ─── ORCHESTRATOR ─────────────────────────────────────────────────────────────

const METADATA_VM = 'yt-lockup-metadata-view-model';

export function injectIntoCard(card: Element, storage: Storage): void {
	const videoId = extractVideoId(card);
	if (!videoId) return;

	if (card.hasAttribute(INJECTED_ATTR)) return;

	const initialState = storage.hasCopied(videoId) ? 'copied' : 'idle';
	const btn = createButton(videoId, storage, initialState);

	const metadataVM = card.querySelector(METADATA_VM);
	if (metadataVM) {
		if (metadataVM.hasAttribute(INJECTED_ATTR)) return;
		metadataVM.setAttribute(INJECTED_ATTR, '1');

		let injected = false;
		if (isWatchPage()) {
			injected = injectWatchPage(metadataVM, btn);
		} else {
			injectFeedCard(metadataVM, btn);
			injected = true;
		}

		if (!injected) return;
	} else {
		if (!injectSearchCard(card, btn)) return;
	}

	card.setAttribute(INJECTED_ATTR, '1');
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
// Card-level selectors — update here if YouTube renames its custom elements

const CARD_SELECTORS = [
	'ytd-rich-item-renderer',
	'ytd-video-renderer',
	'ytd-compact-video-renderer',
	'ytd-grid-video-renderer',
	'yt-lockup-view-model',
];

export function injectAll(storage: Storage): void {
	const selector = CARD_SELECTORS.map(
		(s) => `${s}:not([${INJECTED_ATTR}])`,
	).join(',');

	document.querySelectorAll(selector).forEach((card) => {
		injectIntoCard(card, storage);
	});
}
