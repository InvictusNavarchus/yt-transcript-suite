import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
	plugins: [
		monkey({
			entry: 'src/main.ts',
			userscript: {
				name: 'YouTube Copy Transcript',
				namespace: 'http://tampermonkey.net/',
				version: '0.0.0',
				description:
					'Adds a "Copy Transcript" button to every YouTube video card. Remembers which videos you\'ve already copied.',
				author: 'You',
				match: ['https://www.youtube.com/*'],
				grant: [
					'GM_xmlhttpRequest',
					'GM_setClipboard',
					'GM_getValue',
					'GM_setValue',
				],
				connect: ['localhost'],
				'run-at': 'document-idle',
			},
		}),
	],
});
