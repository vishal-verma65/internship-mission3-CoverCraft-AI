# CoverCraft AI — Intelligent Cover Letter Generator

Generate personalized, ATS-friendly cover letters powered by Mistral AI in seconds.

Built with Vanilla JS ES Modules, Mistral AI API, pdf.js, and axios.

---

## Setup

### 1. Get Your Mistral API Key

1. Go to https://console.mistral.ai/api-keys
2. Sign in with your Mistral account (create one if needed)
3. Click "Create API Key" and copy it

### 2. Create `.env` File

Create a `.env` file in the project root:

```env
VITE_MISTRAL_API_KEY=your_mistral_api_key_here
VITE_MISTRAL_API_BASE_URL=https://api.mistral.ai/v1
VITE_MISTRAL_MODEL=mistral-small-latest
```

The app reads from this file via `import.meta.env.VITE_*`.

### 3. Serve Locally

Run a local web server (required for ES Modules):

```bash
npx serve .
```

Or use VS Code's Live Server extension.

### 4. Open in Browser

Visit `http://localhost:8080` and start generating cover letters!

---

## Project Structure

```
/project
├── index.html              Single-page app shell + semantic HTML
├── styles.css              Full CSS (dark/light theme, animations, layout)
│
├── /js
│   ├── main.js             Entry point — boots all modules in order
│   ├── config.js           API key + all app configuration constants
│   ├── api.js              Mistral AI API axios layer (retry, error handling)
│   ├── promptBuilder.js    Dynamic prompt engineering for Mistral
│   ├── pdfParser.js        pdf.js resume text extraction
│   ├── formHandler.js      Form state, tags, upload, submit, draft save
│   ├── validators.js       Pure validation + DOM error helpers
│   ├── storage.js          localStorage: theme, draft, history
│   ├── ui.js               Output card rendering + regenerate button
│   ├── history.js          History grid rendering + card interactions
│   ├── loadingManager.js   Skeleton, spinner, form-lock orchestration
│   ├── theme.js            Dark/light theme toggle + OS preference
│   ├── animations.js       Particle canvas, scroll-reveal, ripple
│   ├── clipboard.js        Copy-to-clipboard with fallback
│   ├── downloader.js       Export as TXT / PDF (print dialog)
│   ├── notifications.js    Toast notification system
│   └── utils.js            Shared pure utilities (debounce, DOM, etc.)
│
├── .env.example            Documents required environment variables
└── README.md               This file
```

---

## Module Responsibilities

| Module | Role |
|---|---|
| `main.js` | Bootstraps every module after DOMContentLoaded |
| `config.js` | Single source of truth for all constants |
| `api.js` | All Mistral AI HTTP traffic via axios; retry + error mapping |
| `promptBuilder.js` | Constructs ATS-optimised prompts from form data |
| `pdfParser.js` | pdf.js wrapper; validates, extracts, truncates |
| `formHandler.js` | Owns form state; tag system; PDF upload; submit flow |
| `validators.js` | Pure field validators + DOM error display |
| `storage.js` | localStorage wrappers for draft, history, theme |
| `ui.js` | Renders output card; wires regenerate callback |
| `history.js` | Builds history grid cards; restore-on-click |
| `loadingManager.js` | Coordinates skeleton/spinner/button/form states |
| `theme.js` | Theme apply, toggle, OS detection, persistence |
| `animations.js` | Canvas particles, scroll-reveal, ripple effects |
| `clipboard.js` | Modern clipboard API + execCommand fallback |
| `downloader.js` | TXT Blob download; PDF via print dialog |
| `notifications.js` | Toast system; error code → message mapping |
| `utils.js` | debounce, throttle, DOM helpers, triggerDownload |

---

## Technology Choices

**axios** — All API calls use axios (not fetch). The axios instance in
`api.js` has pre-configured timeout, interceptors, and retry logic.

**pdf.js** — Resume PDF parsing runs entirely in the browser via the
pdf.js CDN worker. No server upload needed.

**ES Modules** — Every file uses `import`/`export`. No bundler required
for development; works natively in all modern browsers.

---

## Security Warning — Frontend API Keys

This application is frontend-only. The Mistral API key in `config.js`
is visible to anyone who opens DevTools → Sources or inspects network
requests.

**This is acceptable for:**
- Local development
- Personal use projects
- Demos / prototypes

**For production, use a backend proxy:**

```
Browser → Your Server (holds the key) → Mistral AI
```

Example proxy options:
- Node.js + Express endpoint that forwards requests
- Next.js API Routes (`/api/generate`)
- Cloudflare Workers
- Vercel Edge Functions

Your proxy receives the prompt from the browser, appends the secret key,
calls Mistral AI, and returns the response. The key never leaves your server.

---

## Customisation

**Change the AI model** — Edit `MISTRAL_MODEL` in `config.js`.

**Adjust creativity** — Change `temperature` in `REQUEST_CONFIG` (0 = strict, 1 = creative).

**Change max PDF size** — Edit `PDF_CONFIG.maxFileSizeMB` in `config.js`.

**Add more tone options** — Extend `TONE_DESCRIPTORS` in `promptBuilder.js`
and add a new `<label class="tone-card">` in `index.html`.

**Change history limit** — Edit `HISTORY_CONFIG.maxEntries` in `config.js`.

---

## Browser Support

Requires a modern browser with support for:
- ES2020+ (modules, optional chaining, nullish coalescing)
- `IntersectionObserver`
- `navigator.clipboard` (or falls back to execCommand)
- Canvas 2D API (particles)

Tested in: Chrome 120+, Firefox 121+, Safari 17+, Edge 120+