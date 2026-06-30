import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
	plugins: [
		monkey({
			entry: 'src/main.ts',
			userscript: {
				name: 'YouTube Copy Transcript',
				namespace: 'https://github.com/InvictusNavarchus/yt-transcript-suite',
				version: '0.2.0',
				description:
					'Adds a "Copy Transcript" button to every YouTube video card. Remembers which videos you\'ve already copied.',
				author: 'Invictus Navarchus',
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
