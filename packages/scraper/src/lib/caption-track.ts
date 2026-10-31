import {
	YoutubeTranscriptDisabledError,
	YoutubeTranscriptNotAvailableError,
	YoutubeTranscriptNotAvailableLanguageError,
} from '../errors';
import type { CaptionTrack, YouTubePlayerResponse } from '../types';

export function extractCaptionTracks(
	playerJson: YouTubePlayerResponse,
	identifier: string,
): CaptionTrack[] {
	const tracklist =
		playerJson?.captions?.playerCaptionsTracklistRenderer ??
		playerJson?.playerCaptionsTracklistRenderer;

	const tracks = tracklist?.captionTracks;
	const isPlayableOk = playerJson?.playabilityStatus?.status === 'OK';

	if (!playerJson?.captions || !tracklist) {
		if (isPlayableOk) {
			throw new YoutubeTranscriptDisabledError(identifier);
		}
		throw new YoutubeTranscriptNotAvailableError(identifier);
	}

	if (!Array.isArray(tracks) || tracks.length === 0) {
		throw new YoutubeTranscriptDisabledError(identifier);
	}

	return tracks;
}

interface LanguageInference {
	inferredLanguage?: string;
	evidence: 'original-audio-label' | 'single-asr-language' | 'unknown';
}

function baseLanguage(language: string): string {
	return language.toLowerCase().split('-')[0];
}

function inferLanguage(
	tracks: CaptionTrack[],
	playerJson: YouTubePlayerResponse,
): LanguageInference {
	const originals = new Set<string>();
	for (const format of playerJson.streamingData?.adaptiveFormats ?? []) {
		const audio = format.audioTrack;
		if (
			audio?.id &&
			!audio.isAutoDubbed &&
			/\boriginal\b/i.test(audio.displayName ?? '')
		) {
			originals.add(audio.id.split('.')[0].toLowerCase());
		}
	}
	if (originals.size === 1) {
		return {
			inferredLanguage: [...originals][0],
			evidence: 'original-audio-label',
		};
	}
	// Conflicting original labels must not be overridden by caption guesses.
	if (originals.size === 0) {
		const languages = new Set(
			tracks
				.filter((track) => track.kind === 'asr')
				.map((track) => baseLanguage(track.languageCode)),
		);
		if (languages.size === 1) {
			return {
				inferredLanguage: [...languages][0],
				evidence: 'single-asr-language',
			};
		}
	}
	return { evidence: 'unknown' };
}

function preferredTrack(
	tracks: CaptionTrack[],
	language: string,
): CaptionTrack | undefined {
	const requested = language.toLowerCase();
	const matches = tracks.filter((track) =>
		requested.includes('-')
			? track.languageCode.toLowerCase() === requested
			: baseLanguage(track.languageCode) === requested,
	);
	return (
		matches.find(
			(track) =>
				track.kind !== 'asr' && track.languageCode.toLowerCase() === requested,
		) ??
		matches.find((track) => track.kind !== 'asr') ??
		matches.find((track) => track.languageCode.toLowerCase() === requested) ??
		matches[0]
	);
}

export function selectTrack(
	tracks: CaptionTrack[],
	lang: string | undefined,
	identifier: string,
	playerJson: YouTubePlayerResponse,
) {
	const inference = inferLanguage(tracks, playerJson);
	const targetLanguage =
		lang ||
		(baseLanguage(inference.inferredLanguage ?? '') === 'id' ? 'id' : 'en');
	let selectedTrack = preferredTrack(tracks, targetLanguage);
	let reason = lang
		? 'explicit-language'
		: selectedTrack?.kind === 'asr'
			? 'automatic-target-language'
			: 'dedicated-target-language';
	if (
		!lang &&
		targetLanguage === 'id' &&
		(!selectedTrack || selectedTrack.kind === 'asr')
	) {
		const english = preferredTrack(tracks, 'en');
		if (english && english.kind !== 'asr') {
			selectedTrack = english;
			reason = 'dedicated-english-fallback';
		}
	}

	if (!selectedTrack) {
		const available = tracks.map((t) => t.languageCode).filter(Boolean);
		throw new YoutubeTranscriptNotAvailableLanguageError(
			targetLanguage,
			available,
			identifier,
		);
	}

	return {
		track: selectedTrack,
		decision: {
			...inference,
			targetLanguage,
			selectedLanguage: selectedTrack.languageCode,
			captionKind: selectedTrack.kind === 'asr' ? 'automatic' : 'dedicated',
			reason,
		},
	};
}

export function buildTranscriptUrl(
	track: CaptionTrack,
	identifier: string,
): string {
	const raw: string = track.baseUrl || track.url || '';

	if (!raw) {
		throw new YoutubeTranscriptNotAvailableError(identifier);
	}

	const url = raw.replace(/&fmt=[^&]+/, '');

	return url;
}
