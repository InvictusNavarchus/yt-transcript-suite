# @youtube-transcript/server

A local background HTTP server that acts as a bridge between the browser userscript and the transcript scraper library.

Because YouTube rate-limits and blocks non-residential IP ranges (like Cloudflare, AWS, etc.), this server runs locally on your machine, leveraging your residential IP address to fetch transcripts successfully.

## Getting Started

### 1. Configuration
Create a `.env` file in the root of the monorepo (or copy from `.env.example`):
```ini
PORT=3456
SERVER_API_KEY=your_secure_api_key_here
```

### 2. Commands
Run these commands from the monorepo root:
* **Start Server (Development with Hot Reload):**
  ```bash
  bun run dev:server
  ```
* **Start Server (Production/Standard):**
  ```bash
  bun --filter "@youtube-transcript/server" start
  ```

---

## API Documentation

### `GET /transcript`

Fetches and formats a YouTube transcript.

#### Request Parameters
* **`videoId`** (Query param, Required): The 11-character YouTube video ID or a full YouTube URL.

#### Request Headers
* **`x-api-key`** or **`Authorization`**: If `SERVER_API_KEY` is configured on the server, you must provide it in the request.
  ```http
  x-api-key: your_secure_api_key_here
  ```
  or
  ```http
  Authorization: Bearer your_secure_api_key_here
  ```

#### Response Example (`200 OK`)
```json
{
  "videoId": "dQw4w9WgXcQ",
  "transcript": "title: Rick Astley - Never Gonna Give You Up\nauthor: Rick Astley\nduration: 212 seconds\n...\n\nWe're no strangers to love\nYou know the rules and so do I..."
}
```

#### Error Response (`502 Bad Gateway`)
Returned if YouTube returns an error (e.g. video unavailable, transcripts disabled, or rate-limited):
```json
{
  "error": "Transcripts are disabled for this video: dQw4w9WgXcQ"
}
```
