# Better Prompt – Prompt Enhancement Demo

A professional web interface to demonstrate AI prompt enhancement for a text-to-image company. Users type a prompt (English or Farsi), the app fetches suggestions from a Cloudflare Worker, highlights suggested phrases with gradient text, and lets users replace them with animated transitions.

## Features

### Core Functionality
- **Real-time Enhancement**: Highlights suggested words/phrases and offers replacements
- **Multi-language**: English + Farsi with automatic RTL/LTR
- **Debounce & Cancellation**: 1s delay after typing stops; cancels in-flight requests
- **Directional Animations**: Replacement animation respects text direction (RTL/LTR)

### UX
- **Professional UI** with subtle depth, gradients, and smooth transitions
- **Responsive** on desktop and mobile
- **Status & Debug**: Request counter and status indicator

### Technical
- **API**: Cloudflare Worker integration (POST JSON)
- **CORS Handling**: Local server with proper headers
- **Security**: No secrets in repo; `.env` -> runtime config

## Project Structure

```
Better_prompt/
├── index.html          # Main app
├── styles.css          # Styling & animations
├── script.js           # Frontend logic
├── config.js           # Defaults (overridden by runtime)
├── server.py           # Local dev server + .env loader
├── start_server.sh     # Helper to run the server
├── .gitignore          # Ignore rules
└── README.md           # This file
```

## API Integration

- **Endpoint**: `https://better-prompt.nebula-ai-company.workers.dev/`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{ "prompt": "یک گربه در حال بازی کردن" }
```

## Quick Start

1. Create a `.env` in the project root:
```env
API_KEY=YOUR_API_KEY
API_URL=https://better-prompt.nebula-ai-company.workers.dev/
```
2. Start the local server (ensures CORS & injects env):
```bash
./start_server.sh
# or
python3 server.py
```
3. Open `http://localhost:8000`
4. Type a prompt (English or Farsi). Suggestions appear ~1s after you stop typing.
5. Hover highlighted words to view suggestions; click to replace with animation.

## Developer Notes

- `server.py` reads `.env` and writes `config.runtime.js` (ignored by git). `config.js` provides defaults.
- Requests use a query parameter for the API key to avoid CORS issues with custom headers.
- In-flight requests are aborted when the user resumes typing; stale responses are ignored.

## Troubleshooting

- No suggestions: verify API URL and internet connection
- CORS errors: ensure you’re running via `server.py` (not file://)
- RTL/LTR issues: confirm the Vazirmatn font loads (for Farsi)

## License

Demo project for showcasing prompt enhancement. Ensure appropriate licensing for production use.
