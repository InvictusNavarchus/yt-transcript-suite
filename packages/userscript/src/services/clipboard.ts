import { GM_setClipboard } from '$';

export async function writeClipboard(text: string): Promise<void> {
	// GM_setClipboard works without the Clipboard Permission prompt
	GM_setClipboard(text, 'text');
}
