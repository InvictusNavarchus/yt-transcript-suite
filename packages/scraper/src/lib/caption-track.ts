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

export function selectTrack(
	tracks: CaptionTrack[],
	lang: string | undefined,
	identifier: string,
): CaptionTrack {
	const selectedTrack = lang
		? tracks.find((t) => t.languageCode === lang)
		: tracks[0];

	if (!selectedTrack) {
		const available = tracks.map((t) => t.languageCode).filter(Boolean);
		throw new YoutubeTranscriptNotAvailableLanguageError(
			lang as string,
			available,
			identifier,
		);
	}

	return selectedTrack;
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
