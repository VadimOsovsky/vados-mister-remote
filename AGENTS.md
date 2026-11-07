# Repository Guide

## Project Overview

MiSTer Remote — a React 19 + TypeScript PWA for remotely controlling a MiSTer FPGA retro gaming device. Communicates with MiSTer via the Wizzo API (mrext) over HTTP on port 8182.

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript check + Vite production build (tsc -b && vite build)
npm test             # Run the TypeScript tests with Node 22.15+ and tsx
npm run test:manuals  # Run the manual publishing tests
npm run lint         # ESLint (flat config with TS + React Hooks plugins)
npm run preview      # Preview production build locally
npm run build-library  # Download LaunchBox metadata and generate public/launchbox/*.json
```

## Architecture

React Router handles the app routes. The collection game route resolves its game ID against the active console. Zustand exposes shared state through selectors. Search, forms and other screen-local state live in React components.

### Key modules

- **`src/App.tsx`** — App shell, routes and app-wide effects. Feature screens live in `src/features`.
- **`src/state`** — Separate Zustand stores for collection and wallet state and for the MiSTer connection. One app-level component runs connection polling and the now-playing subscription.
- **`src/lib/sharedStorage.ts`** — Source of persisted collection and wallet data. Initializes before the collection store, publishes value changes and groups related writes into one revisioned snapshot. Development uses localStorage. Zustand has no separate persistence layer.
- **`src/services/wizzoApi.ts`** — HTTP client for the MiSTer Remote API (mrext/wizzo). Covers system management, game search, play commands, screenshots, and keyboard input.
- **`src/services/launchbox.ts`** — Game metadata service. Loads game data from static JSON files (`public/launchbox/*.json`), caches in IndexedDB (v2) with a memory cache layer on top. Resolves box art images from the LaunchBox CDN by region.
- **`src/types.ts`** — Shared TypeScript interfaces.
- **`src/constants.ts`** — Platform definitions and configuration for NES variants (NES NTSC, NES PAL, Famicom, AV Famicom).

### Data flow

1. Game metadata loaded from `public/launchbox/*.json` static files
2. Cached in IndexedDB for offline/PWA use, with in-memory cache on top
3. Box art URLs resolved from LaunchBox CDN, proxied through wsrv.nl for optimization
4. MiSTer device controlled via Wizzo API HTTP calls (port 8182)

### PWA

Configured via `vite-plugin-pwa` in `vite.config.ts` — auto-updating service worker, Workbox runtime caching for images with CacheFirst strategy.

## TypeScript Config

- Target: ES2023, strict mode enabled
- `erasableSyntaxOnly: true` — use type-only imports/exports
- `noUnusedLocals` and `noUnusedParameters` enabled
- Multi-config setup: `tsconfig.app.json` (app code) and `tsconfig.node.json` (build tooling) composed via project references in `tsconfig.json`

## MVP Checklist

[] Save/Load in controls tab with 4 slots (2x2 grid) + screenshots when saved (like in nes classic mini)
[] Indicating if a game is beaten (start in the top-right corner of the game in the list)

