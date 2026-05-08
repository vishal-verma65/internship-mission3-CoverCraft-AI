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

## Features

✨ **AI-Powered** — Uses Mistral AI for intelligent cover letter generation  
📄 **PDF Upload** — Extract text from your resume automatically  
🎨 **Dark/Light Mode** — Automatic theme switching based on OS preference  
💾 **Auto-Save** — Drafts saved to localStorage automatically  
📱 **Responsive** — Works on desktop, tablet, and mobile  
⚡ **Fast** — Lightweight, no build step required  
✅ **ATS-Optimized** — Generates ATS-friendly letters  

---

## Project Structure

```
frontend/
├── index.html              Main HTML page
├── src/
│   ├── main.js             App entry point
│   ├── style.css           Styling (dark/light theme)
│   └── js/
│       ├── config.js       Configuration & constants
│       ├── api.js          Mistral AI API calls
│       ├── formHandler.js  Form state management
│       ├── ui.js           Output rendering
│       ├── validators.js   Form validation
│       ├── theme.js        Dark/light theme toggle
│       ├── storage.js      localStorage persistence
│       ├── animations.js   UI animations
│       ├── clipboard.js    Copy to clipboard
│       ├── downloader.js   Export as TXT/PDF
│       ├── history.js      Generation history
│       ├── notifications.js Toast messages
│       ├── pdfParser.js    Resume PDF parsing
│       ├── promptBuilder.js Dynamic prompt generation
│       ├── loadingManager.js Loading states
│       └── utils.js        Utility functions
└── .env                    Environment variables (VITE_MISTRAL_*)
```

---

## Configuration

All settings are in `src/js/config.js`:

```js
export const MISTRAL_MODEL = "mistral-small-latest";  // AI model
export const REQUEST_CONFIG = {
  temperature: 0.75,    // 0=strict, 1=creative
  maxTokens: 2048,
  timeout: 30_000,
};
export const FORM_CONFIG = {
  maxSkillTags: 15,
  maxJobDescriptionChars: 3_000,
};
```

---

## How It Works

1. **Fill Form** — Enter your details, skills, and job description
2. **Upload Resume** — Optional PDF extraction of your experience
3. **Select Tone** — Choose professional, friendly, confident, or formal
4. **Generate** — Mistral AI creates a personalized cover letter
5. **Export** — Download as TXT or PDF, or copy to clipboard
6. **History** — All generated letters saved locally for easy recall

---

## Customization

### Change AI Model
Edit `VITE_MISTRAL_MODEL` in `.env`:
```env
VITE_MISTRAL_MODEL=mistral-medium-latest
```

### Adjust Creativity
In `src/js/config.js`, modify `temperature` (0-1, where 0 = strict, 1 = creative):
```js
temperature: 0.75,
```

### Max Resume Size
In `src/js/config.js`:
```js
maxFileSizeMB: 5,  // Change to desired size
```

### Add Tone Options
1. Add to `TONE_DESCRIPTORS` in `src/js/promptBuilder.js`
2. Add new button in `index.html` inside the tone grid

---

## Browser Support

- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

Requires ES2020+ support and modern APIs (Fetch, Canvas, localStorage).

---

## Tips

- **Generate multiple versions** — Use the regenerate button to create different versions
- **Copy easily** — Copy button preserves formatting for pasting into applications
- **Track history** — View up to 10 recent generations (stored locally)
- **Offline works** — After first load, works entirely offline
- **Auto-save** — Form drafts automatically saved as you type