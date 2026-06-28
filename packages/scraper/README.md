# @youtube-transcript/scraper

A JavaScript library to fetch transcripts from YouTube videos. Designed for edge environments like Cloudflare Workers, Vercel Edge, Deno, and Bun.

**Note:** This project was originally forked from [https://github.com/ericmmartin/youtube-transcript-plus](https://github.com/ericmmartin/youtube-transcript-plus) (which only works in Node.js environments) and restructured as a TypeScript package inside this monorepo. It removes Node-specific modules (like `fs`, `path`) to run perfectly in any JS environment.

This package uses YouTube's unofficial API, so it may break if YouTube changes its internal structure.

## Installation

Within the monorepo, reference it as a workspace dependency:
```json
"dependencies": {
  "@youtube-transcript/scraper": "workspace:*"
}
```

If publishing to npm:
```bash
$ bun add @youtube-transcript/scraper
```

## Usage

### Basic Usage

```javascript
import { fetchTranscript } from '@youtube-transcript/scraper';

// Fetch transcript using default settings
fetchTranscript('videoId_or_URL').then(console.log).catch(console.error);
```

### Custom User-Agent

You can pass a custom `userAgent` string to mimic different browsers or devices.

```javascript
fetchTranscript('videoId_or_URL', {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
})
  .then(console.log)
  .catch(console.error);
```

### Custom Fetch Functions

You can inject custom `videoFetch`, `playerFetch`, and `transcriptFetch` functions to modify the fetch behavior, such as using a proxy or custom headers. The library makes three types of HTTP requests:

1. **`videoFetch`**: Fetches the YouTube video page (GET request)
2. **`playerFetch`**: Calls YouTube's Innertube API to get caption tracks (POST request)
3. **`transcriptFetch`**: Downloads the actual transcript data (GET request)

```javascript
fetchTranscript('videoId_or_URL', {
  videoFetch: async ({ url, lang, userAgent }) => {
    // Custom logic for video page fetch (GET)
    return fetch(`https://my-proxy-server.com/?url=${encodeURIComponent(url)}`, {
      headers: {
        ...(lang && { 'Accept-Language': lang }),
        'User-Agent': userAgent,
      },
    });
  },
  playerFetch: async ({ url, method, body, headers, lang, userAgent }) => {
    // Custom logic for Innertube API call (POST)
    return fetch(`https://my-proxy-server.com/?url=${encodeURIComponent(url)}`, {
      method,
      headers: {
        ...(lang && { 'Accept-Language': lang }),
        'User-Agent': userAgent,
        ...headers,
      },
      body,
    });
  },
  transcriptFetch: async ({ url, lang, userAgent }) => {
    // Custom logic for transcript data fetch (GET)
    return fetch(`https://my-proxy-server.com/?url=${encodeURIComponent(url)}`, {
      headers: {
        ...(lang && { 'Accept-Language': lang }),
        'User-Agent': userAgent,
      },
    });
  },
})
  .then(console.log)
  .catch(console.error);
```

### Language Support

You can specify the language for the transcript using the `lang` option.

```javascript
fetchTranscript('videoId_or_URL', {
  lang: 'fr', // Fetch transcript in French
})
  .then(console.log)
  .catch(console.error);
```

### Error Handling

The library throws specific errors for different failure scenarios. Each error includes a `videoId` property for programmatic handling.

```javascript
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from '@youtube-transcript/scraper';

fetchTranscript('videoId_or_URL')
  .then(console.log)
  .catch((error) => {
    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      console.error('Video is unavailable:', error.videoId);
    } else if (error instanceof YoutubeTranscriptDisabledError) {
      console.error('Transcripts are disabled:', error.videoId);
    } else if (error instanceof YoutubeTranscriptNotAvailableError) {
      console.error('No transcript available:', error.videoId);
    } else if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
      console.error('Language not available:', error.lang, error.availableLangs);
    } else {
      console.error('An unexpected error occurred:', error.message);
    }
  });
```

### TypeScript Types

All types are exported for TypeScript consumers:

```typescript
import type {
  TranscriptConfig,
  TranscriptResponse,
  FetchParams,
} from '@youtube-transcript/scraper';
```

## API

### `fetchTranscript(videoId: string, config?: TranscriptConfig)`

Fetches the transcript for a YouTube video.

- **`videoId`**: The YouTube video ID or URL.
- **`config`**: Optional configuration object with the following properties:
  - **`lang`**: Language code (e.g., `'en'`, `'fr'`) for the transcript.
  - **`userAgent`**: Custom User-Agent string.
  - **`videoFetch`**: Custom fetch function for the video page request (GET).
  - **`playerFetch`**: Custom fetch function for the YouTube Innertube API request (POST).
  - **`transcriptFetch`**: Custom fetch function for the transcript data request (GET).

Returns a `Promise<TranscriptResponse[]>` where each item in the array represents a transcript segment with the following properties:

- **`text`**: The text of the transcript segment.
- **`duration`**: The duration of the segment in seconds.
- **`offset`**: The start time of the segment in seconds.
- **`lang`**: The language of the transcript.

## Errors

The library throws the following errors:

- **`YoutubeTranscriptVideoUnavailableError`**: The video is unavailable or has been removed. Properties: `videoId`.
- **`YoutubeTranscriptDisabledError`**: Transcripts are disabled for the video. Properties: `videoId`.
- **`YoutubeTranscriptNotAvailableError`**: No transcript is available for the video. Properties: `videoId`.
- **`YoutubeTranscriptNotAvailableLanguageError`**: The transcript is not available in the specified language. Properties: `videoId`, `lang`, `availableLangs`.
- **`YoutubeTranscriptTooManyRequestError`**: YouTube is rate-limiting requests from your IP.
- **`YoutubeTranscriptInvalidVideoIdError`**: The provided video ID or URL is invalid.
