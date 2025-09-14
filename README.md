<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/justinlietz93/productivity_workspace/blob/main/productivity_tools/AI-Content-Suite/assets/img/ai-content-suite.png" />
</div>

# AI-Content-Suite (provider-agnostic)

This app now talks to a lightweight Python backend that unifies multiple AI providers (OpenAI, Anthropic, DeepSeek, Gemini via configured adapters). The frontend no longer uses a direct Gemini SDK.

## Architecture overview

- Backend: FastAPI service in `productivity_tools/provider_service` exposing provider-agnostic endpoints:
  - POST `/api/chat` — chat/generation (text and basic multimodal)
  - GET `/api/models` — list models for a provider
  - GET/POST `/api/keys` — manage API keys (stored locally in a vault)
  - GET/POST `/api/prefs` — manage default provider/model
- Frontend: Vite React app calling the backend via `services/providerService.ts`.

## Prerequisites

- Python 3.10+
- Node.js 18+

## Quick start

1) Start the backend (from repo root):

   - Install Python deps (see top-level `requirements.txt`).
   - Run the dev server:

     python -m productivity_tools.provider_service.dev_server

   The server listens on <http://127.0.0.1:8091> by default.

2) Configure frontend env (in `AI-Content-Suite/.env.local`):

   VITE_PROVIDER_SERVICE_URL=http://127.0.0.1:8091
   VITE_DEFAULT_PROVIDER=openai
   VITE_DEFAULT_MODEL=gpt-4o-mini

3) Start the frontend (in `AI-Content-Suite/`):

   npm install
   npm run dev

Open <http://localhost:5173> (or the port Vite prints).

## Managing API keys and prefs

Keys and preferences are stored locally by the backend under `productivity_tools/providers/key_vault` (git-ignored).

- POST `/api/keys` with JSON `{ "keys": { "openai": "sk-...", "anthropic": "...", "deepseek": "...", "gemini": "..." } }`
- POST `/api/prefs` with JSON `{ "prefs": { "defaultProvider": "openai", "defaultModel": "gpt-4o-mini" } }`

The frontend also exposes helpers in `services/providerService.ts`:

- `saveKeys(keys)`
- `savePrefs(prefs)` and `getPrefs()`

## Notes

- CORS is restricted by allowlist in the backend; set allowed origins via env if you host differently.
- For streaming or advanced features, extend the backend provider adapters as needed.
