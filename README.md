# MiSTer Remote monorepo

Install app dependencies with `yarn install --frozen-lockfile` using Yarn Classic 1.22.22.

The application lives in `src/` and `public/` with its existing root build commands. Standalone HTML game manuals live in [`manuals/`](manuals/README.md) and have an independent GitHub Pages workflow. Manuals are excluded from the Vite output and MiSTer deployment.

Build manuals with `yarn build:manuals`; verify publishing with `yarn test:manuals`. See the [manual authoring and deployment guide](manuals/README.md) for stable URLs and cache behavior.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# Shared Playroom data on MiSTer

The production app uses the Playroom HTTP server from `scripts/spa-server.py` for its shared state. Deploy the server together with the frontend using `scripts/deploy-mister.sh`. State is stored at `/media/fat/playroom-data/state.json`, beside the deployment directory. Back up this file alongside the emulator's save files.

## GitHub Pages

Pushes to `main` build and publish the manuals at the existing URLs and the app at [`/app/`](https://vadimosovsky.github.io/vados-mister-remote/app/). Both are published in one deployment. The repository uses GitHub Actions as its Pages source.

The Pages app uses browser-local storage by default. For shared collection data, set the Actions repository variable `VITE_PLAYROOM_API_ORIGIN` to a browser-reachable HTTPS origin for the Playroom server. The state endpoint accepts cross-origin requests from `https://vadimosovsky.github.io`. This public setting configures collection sync only. Device control still requires a browser connection to MiSTer and depends on the browser's HTTPS and local-network rules. Builds for MiSTer use the same-origin storage endpoint by default.

On Windows, run `yarn deploy-mister:windows` with Windows PowerShell, the OpenSSH client, and `tar.exe` available. The default MiSTer address is `192.168.0.118`. To override it, run `yarn deploy-mister:windows 192.168.0.120` or set the `MISTER_IP` environment variable.

On Windows, run `yarn deploy-mister:launchbox` on first setup and whenever the JSON files in `public/launchbox` change. It accepts the same IP override and uploads the metadata without building the app or restarting the server. Both app deploy scripts preserve the existing LaunchBox directory on MiSTer.

Open the updated app first in the browser and at the address where your existing collection lives. The first browser with local data can import it while the shared store is uninitialized. Other devices then see the shared collection when they open the app. Browser storage is scoped to the origin, so data from localhost or another MiSTer address cannot be imported automatically. The import leaves the old browser data intact.

The MiSTer host address stays local to each browser. Vite development and its preview fixtures also use local browser data.

## Photo credits

AV Famicom photo by Muband, [New Famicom.jpg](https://commons.wikimedia.org/wiki/File:New_Famicom.jpg), licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The cropped WebP with a transparent background is available under the same license.
