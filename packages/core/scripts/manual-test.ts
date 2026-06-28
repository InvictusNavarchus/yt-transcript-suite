import { fetchTranscript } from '../src/index';

const video_id_or_url = 'https://www.youtube.com/watch?v=RTTCbb_2G4s';
const transcript = await fetchTranscript(video_id_or_url);
const transcript_text = await fetchTranscript(video_id_or_url, {
	format: 'text',
});
const transcript_srt = await fetchTranscript(video_id_or_url, {
	format: 'srt',
});
const transcript_vtt = await fetchTranscript(video_id_or_url, {
	format: 'vtt',
});
const transcript_with_metadata = await fetchTranscript(video_id_or_url, {
	format: 'json',
	includeMetadata: true,
});

const transcript_plain_with_metadata = await fetchTranscript(video_id_or_url, {
	format: 'text',
	includeMetadata: true,
});
const folder = '../pipeline-debug';
Bun.write(`${folder}/transcript.json`, JSON.stringify(transcript, null, 2));
Bun.write(`${folder}/transcript.txt`, transcript_text);
Bun.write(`${folder}/transcript.srt`, transcript_srt);
Bun.write(`${folder}/transcript.vtt`, transcript_vtt);
Bun.write(
	`${folder}/transcript-with-metadata.json`,
	JSON.stringify(transcript_with_metadata, null, 2),
);
Bun.write(
	`${folder}/transcript-plain-with-metadata.txt`,
	transcript_plain_with_metadata,
);
