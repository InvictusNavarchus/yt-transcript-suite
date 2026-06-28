# @youtube-transcript/userscript

A browser userscript (compatible with Tampermonkey, Violentmonkey, etc.) that injects a **"Transcript"** button next to all YouTube video cards (feeds, search, and watch pages).

When clicked, it sends a request to the local background server, receives the plaintext transcript, copies it directly to your system clipboard, and updates its local copy history.

---

## Features

- **DOM Injection**: Automatically polls and injects buttons into YouTube's dynamic custom elements (video feeds, search results, and watch sidebar).
- **Local Copy History**: Remembers which videos you have already copied, rendering a green dot indicator next to the button.
- **Background API calls**: Employs `GM_xmlhttpRequest` to request transcripts from `localhost:3456` without CORS issues.

---

## Configuration

If you configured a `SERVER_API_KEY` on your local server, you must provide it to the userscript at build time:

1. Create `packages/userscript/.env` (or copy from `packages/userscript/.env.example`):
   ```ini
   VITE_TRANSCRIPT_API_KEY=your_secure_api_key_here
   ```

---

## Commands

### 1. Build for Production
Run from the root of the monorepo:
```bash
bun run build:userscript
```
This builds and outputs a single file:
`packages/userscript/dist/youtube-copy-transcript.user.js`

**Installation:**
1. Open Tampermonkey in your browser.
2. Create a new script, copy the entire contents of `youtube-copy-transcript.user.js`, and paste it in.
3. Save the script.

### 2. Development Mode
To develop and see changes instantly without rebuilding:
1. Start the Vite development script from the root:
   ```bash
   bun run dev:userscript
   ```
2. Tampermonkey will output a helper script pointing to your local server. Install that helper script, and it will load files dynamically from `http://localhost:5173/` with Hot Module Replacement (HMR).
