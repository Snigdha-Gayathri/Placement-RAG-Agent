# Placement RAG Agent

AI-powered interview preparation app built with React + Vite.

## Local setup

1. Install dependencies:

	```bash
	npm ci
	```

2. Create `.env` in the project root (you can copy values from `.env.example`).

3. Set your Gemini API key in `.env`:

	```dotenv
	VITE_GEMINI_API_KEY=your_actual_api_key
	```

4. Start development server:

	```bash
	npm run dev
	```

## Production build

```bash
npm run build
```

The static production output is generated in `dist/`.

## Deploy on Render

This repo includes `render.yaml` for one-click Blueprint deployment.

### Option A: Blueprint (recommended)

1. Push this repo to GitHub.
2. In Render, select **New +** → **Blueprint**.
3. Connect the repository.
4. Render reads `render.yaml` and creates the static service.
5. In service settings, set environment variable:
	- `VITE_GEMINI_API_KEY` = your Gemini API key
6. Trigger deploy.

### Option B: Manual Static Site setup

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_GEMINI_API_KEY`

For client-side routing support, `render.yaml` already adds a rewrite from `/*` to `/index.html`.
