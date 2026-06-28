# @youtube-transcript/cli

Command-line interfaces and developer utilities for fetching, formatting, and debugging YouTube transcripts directly from your terminal.

---

## Commands

Run these commands from the monorepo root:

### 1. Fetch Transcripts (`cli`)
Fetches the transcript for a video and prints it to `stdout`.

```bash
bun run cli <video-id-or-url> [options]
```

#### Options:
* **`--format <json|srt|vtt|text>`**: Output format (default: `text`).
* **`--lang <code>`**: Language code, e.g. `en`, `fr` (default: auto-detect).
* **`--metadata`**: Include video metadata (title, author, keywords, duration) as YAML header.
* **`--copy` or `-c`**: Copy the final formatted output directly to the system clipboard.
* **`--debug`**: Writes intermediate network results (watch HTML, player JSON response, captions list) to a debug folder.
* **`--debug-dir <path>`**: Location of the debug folder (default: `./debug`).

#### Examples:
```bash
# Print plaintext transcript
bun run cli https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Print French transcript in SRT format
bun run cli dQw4w9WgXcQ --lang fr --format srt

# Copy JSON transcript with metadata to clipboard
bun run cli dQw4w9WgXcQ --format json --metadata -c
```

---

### 2. Inspect Innertube Player Response (`inspect`)
Fetches YouTube's raw `/youtubei/v1/player` JSON payload. Use this to verify data structures or inspect changes in YouTube's internal API schemas.

```bash
bun run inspect <videoId> [options]
```

#### Options:
* **`--captions-only`**: Print only the captions subtree (significantly smaller output).
* **`--http`**: Use HTTP instead of HTTPS.

#### Example:
```bash
bun run inspect dQw4w9WgXcQ --captions-only
```

---

## Developer Test Scripts

These are scratch testing files located in `packages/cli/src/` that can be run directly during development:
* **Manual pipeline check**: `bun --filter "@youtube-transcript/cli" run manual-test`
* **Single video fetch check**: `bun --filter "@youtube-transcript/cli" run single-test`
* **Metadata parser check**: `bun --filter "@youtube-transcript/cli" run test-metadata <videoId>`
