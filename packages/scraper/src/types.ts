export interface FetchParams {
	url: string;
	lang?: string;
	userAgent?: string;
	method?: 'GET' | 'POST';
	body?: string;
	headers?: Record<string, string>;
}

export interface TranscriptConfig {
	lang?: string;
	format?: 'json' | 'srt' | 'vtt' | 'text';
	userAgent?: string;
	cacheTTL?: number;
	includeMetadata?: boolean;
	debug?: boolean;
	debugDir?: string;
	videoFetch?: (params: FetchParams) => Promise<Response>;
	transcriptFetch?: (params: FetchParams) => Promise<Response>;
	playerFetch?: (params: FetchParams) => Promise<Response>;
}

export interface TranscriptResponse {
	text: string;
	duration: number;
	offset: number;
	lang: string;
}

export interface VideoMetadata {
	/** Video title */
	title?: string;
	/** Video description */
	description?: string;
	/** Video duration in seconds */
	durationSeconds?: number;
	/** Channel/Creator name */
	author?: string;
	/** Channel ID */
	channelId?: string;
	/** Keywords associated with the video */
	keywords?: string[];
	/** YouTube video URL */
	url: string;
	/** Video ID */
	videoId: string;
}

export interface TranscriptWithMetadata {
	transcript: TranscriptResponse[];
	metadata: VideoMetadata;
}

// ─── YouTube Innertube /player API response types ────────────────────────────
// Source: https://www.youtube.com/youtubei/v1/player (ANDROID client)
// Only fields actually accessed by this library are required; the rest are
// optional since the real response contains many more undocumented fields.

export interface CaptionTrack {
	/** Direct URL to the caption XML (SRV3 / plain XML format) */
	baseUrl: string;
	/** Older field; prefer baseUrl but fall back to this if missing */
	url?: string;
	/** BCP-47 language code, e.g. "en", "fr" */
	languageCode: string;
	name?: { simpleText?: string; runs?: Array<{ text: string }> };
	vssId?: string;
	kind?: string;
	isTranslatable?: boolean;
}

export interface PlayerCaptionsTracklistRenderer {
	captionTracks?: CaptionTrack[];
	audioTracks?: unknown[];
	translationLanguages?: Array<{
		languageCode: string;
		languageName?: { simpleText?: string };
	}>;
	defaultAudioTrackIndex?: number;
}

export interface VideoDetails {
	videoId: string;
	title?: string;
	lengthSeconds?: string;
	keywords?: string[];
	channelId?: string;
	/** Channel name / creator */
	author?: string;
	isLiveContent?: boolean;
}

export interface MicroFormat {
	playlistVideoType?: string;
	musicVideoMetadata?: unknown;
	videoDetails?: VideoDetails;
	title?: { simpleText?: string };
	description?: { simpleText?: string };
	lengthSeconds?: string;
}

export interface YouTubePlayerResponse {
	playabilityStatus?: {
		status?: string;
		/** Human-readable reason when status !== "OK" */
		reason?: string;
	};
	/** Present when the video has captions */
	captions?: {
		playerCaptionsTracklistRenderer?: PlayerCaptionsTracklistRenderer;
	};
	/**
	 * Some older / alternative response shapes hoist the renderer to the top
	 * level (e.g. when accessed via certain clients). We handle both paths.
	 */
	playerCaptionsTracklistRenderer?: PlayerCaptionsTracklistRenderer;
	/** Video metadata from the player response */
	videoDetails?: VideoDetails;
	/** Alternative metadata format */
	microformat?: MicroFormat;
}
