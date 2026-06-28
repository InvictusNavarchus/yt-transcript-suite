import { fetchTranscript } from '../index';

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('fetchTranscript integration', () => {
	it('fetches a transcript from YouTube', async () => {
		const transcript = await fetchTranscript('dQw4w9WgXcQ');
		expect(transcript.length).toBeGreaterThan(0);
	});
});
