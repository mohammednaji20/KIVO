# KIVO — Creative Studio Platform

KIVO is a local-first creative studio website and operating dashboard.

## Requirements
- Node.js 20+
- npm

## Run locally
```bash
npm install
npm run dev
```
Website: http://localhost:5173
API: http://localhost:3001

## Production
```bash
npm run build
npm start
```

## Current MVP limitations
- Local SQLite database (`data/kivo.db`).
- No admin authentication is implemented yet. Do not expose the admin API publicly until authentication and authorization are added.
- AI agents, external AI provider connections, media library, and portfolio CMS are not enabled yet.
- Financial overview totals USD transactions only.

Do not commit `.env`, `node_modules`, or SQLite database files.