import { YoutubeTranscriptNotAvailableLanguageError } from '../errors';
import { selectTrack } from '../lib/caption-track';
import type { CaptionTrack, YouTubePlayerResponse } from '../types';

const track = (languageCode: string, kind?: string): CaptionTrack => ({
	baseUrl: `https://example.com/captions?lang=${languageCode}`,
	languageCode,
	kind,
});

const original = (language: string): YouTubePlayerResponse => ({
	streamingData: {
		adaptiveFormats: [
			{
				audioTrack: {
					id: `${language}.4`,
					displayName: `${language} original`,
				},
			},
			{
				audioTrack: {
					id: `${language}.4`,
					displayName: `${language} original`,
				},
			},
			{
				audioTrack: {
					id: 'en-US.10',
					displayName: 'English (US)',
					audioIsDefault: true,
					isAutoDubbed: true,
				},
			},
		],
	},
});

describe('caption selection', () => {
	it('uses Indonesian original audio despite a default English dub and repeated formats', () => {
		const indonesian = track('id', 'asr');
		const result = selectTrack(
			[track('en', 'asr'), indonesian],
			undefined,
			'video',
			original('id'),
		);
		expect(result.track).toBe(indonesian);
		expect(result.decision).toMatchObject({
			inferredLanguage: 'id',
			evidence: 'original-audio-label',
			targetLanguage: 'id',
			reason: 'automatic-target-language',
		});
	});

	it.each(['en-US', 'ja'])(
		'uses English for a %s original with Indonesian automatic captions',
		(language) => {
			const english = track('en', 'asr');
			expect(
				selectTrack(
					[track('id', 'asr'), english],
					undefined,
					'video',
					original(language),
				).track,
			).toBe(english);
		},
	);

	it('infers Indonesian from a single automatic-caption language', () => {
		const result = selectTrack([track('id', 'asr')], undefined, 'video', {});
		expect(result.decision).toMatchObject({
			inferredLanguage: 'id',
			evidence: 'single-asr-language',
			selectedLanguage: 'id',
		});
	});

	it.each(['en', 'en-US', 'en-GB'])(
		'prefers dedicated %s over automatic English regardless of ordering',
		(language) => {
			const dedicated = track(language);
			expect(
				selectTrack([track('en', 'asr'), dedicated], undefined, 'video', {})
					.track,
			).toBe(dedicated);
		},
	);

	it('chooses dedicated captions matching the original when both languages are dedicated', () => {
		const tracks = [track('en'), track('id'), track('id', 'asr')];
		expect(selectTrack(tracks, undefined, 'video', original('id')).track).toBe(
			tracks[1],
		);
		expect(
			selectTrack(tracks, undefined, 'video', original('en-US')).track,
		).toBe(tracks[0]);
	});

	it.each([true, false])(
		'uses dedicated English without dedicated Indonesian (automatic Indonesian present: %s)',
		(hasAutomatic) => {
			const english = track('en-US');
			const tracks = hasAutomatic ? [track('id', 'asr'), english] : [english];
			const result = selectTrack(tracks, undefined, 'video', original('id'));
			expect(result.track).toBe(english);
			expect(result.decision.reason).toBe('dedicated-english-fallback');
		},
	);

	it('does not prefer dedicated Indonesian for a non-Indonesian original', () => {
		const english = track('en', 'asr');
		expect(
			selectTrack([track('id'), english], undefined, 'video', original('en'))
				.track,
		).toBe(english);
	});

	it('defaults ambiguous automatic languages to English', () => {
		const result = selectTrack(
			[track('id', 'asr'), track('en', 'asr')],
			undefined,
			'video',
			{},
		);
		expect(result.decision).toMatchObject({
			evidence: 'unknown',
			targetLanguage: 'en',
		});
		expect(result.decision.inferredLanguage).toBeUndefined();
	});

	it('does not use automatic captions to override conflicting original labels', () => {
		const player = original('id');
		player.streamingData?.adaptiveFormats?.push({
			audioTrack: { id: 'en.4', displayName: 'English original' },
		});
		const result = selectTrack(
			[track('id', 'asr'), track('en')],
			undefined,
			'video',
			player,
		);
		expect(result.decision).toMatchObject({
			evidence: 'unknown',
			selectedLanguage: 'en',
		});
	});

	it('selects dedicated English even when the original language is unknown', () => {
		const result = selectTrack([track('en-GB')], undefined, 'video', {});
		expect(result.decision).toMatchObject({
			evidence: 'unknown',
			selectedLanguage: 'en-GB',
			captionKind: 'dedicated',
		});
	});

	it('honors an explicit Indonesian override despite dedicated English', () => {
		const indonesian = track('id', 'asr');
		const result = selectTrack(
			[track('en'), indonesian],
			'id',
			'video',
			original('en'),
		);
		expect(result.track).toBe(indonesian);
		expect(result.decision.reason).toBe('explicit-language');
	});

	it('accepts regional variants for a base-language override but requires exact regional requests', () => {
		const british = track('en-GB');
		expect(selectTrack([british], 'en', 'video', {}).track).toBe(british);
		expect(() => selectTrack([british], 'en-US', 'video', {})).toThrow(
			YoutubeTranscriptNotAvailableLanguageError,
		);
	});

	it('reports the target and available languages instead of selecting an unrelated track', () => {
		expect(() =>
			selectTrack([track('ja', 'asr')], undefined, 'video', {}),
		).toThrow(
			new YoutubeTranscriptNotAvailableLanguageError('en', ['ja'], 'video'),
		);
	});
});
