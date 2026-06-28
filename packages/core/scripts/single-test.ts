import { fetchTranscript } from '../src/index';

const video_id_or_url =
	'https://www.youtube.com/watch?v=xoriGNUNF7E&pp=ygUHYXBpIGtleQ%3D%3D';
const transcript_plain_with_metadata = await fetchTranscript(video_id_or_url, {
	format: 'text',
	includeMetadata: true,
});
const folder = '../pipeline-debug';
Bun.write(
	`${folder}/transcript-plain-with-metadata.txt`,
	transcript_plain_with_metadata,
);
