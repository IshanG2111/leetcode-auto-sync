<div align="center">
  <img alt="Project banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# leetcode-auto-sync

>A concise, local-first web app skeleton with a server component. This repository contains the source and scripts required to run, develop, and deploy the application locally or in a CI/CD pipeline.

## Quick Links
- View the live AI Studio preview: https://ai.studio/apps/bf67f2f7-fe99-401a-be0b-9604968b8bc0

## Features
- React + TypeScript frontend (see `src/`)
- Lightweight Node/TypeScript server (`server.ts`)
- Vite-powered dev experience

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn

## Installation
1. Install dependencies

```bash
npm install
# or
# yarn install
```

2. Copy environment example (if present) and set secrets

```bash
cp .env.example .env.local  # if an example file exists
```

Set the `GEMINI_API_KEY` in `.env.local` (used by the AI integrations).

## Development
Start the development server with hot reload:

```bash
npm run dev
# or
# yarn dev
```

Open the app in your browser (Vite will show the local URL). The server component (`server.ts`) is included for API or backend functionality.

## Build & Deploy
Build the production bundle:

```bash
npm run build
```

Deployment depends on your target platform (Vercel, Netlify, Docker, etc.). The project is framework-agnostic and can be deployed as a static frontend + serverless function or a Node service.

## Configuration
- Environment variables: configure runtime secrets in `.env.local`.
- Common variable: `GEMINI_API_KEY` — required for AI Studio integrations referenced by this project.

## Contributing
Contributions are welcome. Please open issues for bugs or feature requests, and submit pull requests for proposed changes. Keep changes focused and include tests where appropriate.

## License
Specify the project license here (e.g., MIT). If you don't want to include a license yet, add one before publishing.

## Contact
If you have questions or need help, open an issue or reach out via the repository discussions.

---

_This README was updated to provide a clear, professional overview and developer workflow._
