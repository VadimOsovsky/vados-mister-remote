# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiSTer Remote — a React 19 + TypeScript PWA for remotely controlling a MiSTer FPGA retro gaming device. Communicates with MiSTer via the Wizzo API (mrext) over HTTP on port 8182.

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint         # ESLint (flat config with TS + React Hooks plugins)
npm run preview      # Preview production build locally
npm run parse-launchbox  # Parse LaunchBox XML data into JSON (tsx scripts/parse-launchbox.ts)
```

No test framework is configured yet.

## Architecture

**Single-page React app** with no router or state management library — all state lives in React hooks inside `App.tsx`.

### Key modules

- **`src/App.tsx`** — Main (and only) component. Handles game browsing, filtering, favorites, settings, and remote control UI. This is the bulk of the app.
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
