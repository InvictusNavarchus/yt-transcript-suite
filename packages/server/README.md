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

### 3. Autostart (systemd user service)
Rather than starting the server by hand after every boot, install it as a systemd user service from the monorepo root:
```bash
./install.sh              # install, enable at login, and start
./install.sh --uninstall  # stop, disable, and remove
```

The unit is rendered from [`yt-transcript-server.service.in`](./yt-transcript-server.service.in) into `~/.config/systemd/user/`. Two details in that template are load-bearing:

* **`WorkingDirectory` is the monorepo root, not this package.** Bun auto-loads `.env` relative to the working directory, and `.env` lives at the root. Pointing it here would make `PORT` and `SERVER_API_KEY` silently stop being read.
* **`ExecStart` runs `src/index.ts` directly**, not via `bun run --filter`. That wrapper spawns a child process to do the real work, which would leave systemd supervising the wrapper -- wrong `MainPID`, and stop signals landing on the parent instead of the server.

```bash
journalctl --user -u yt-transcript-server -f   # follow logs
systemctl --user stop yt-transcript-server     # frees the port for `dev`
```

Because the service holds the port, stop it before running `bun run dev:server`.

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
