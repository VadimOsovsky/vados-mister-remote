import { registerHooks } from 'node:module';

// Vite exposes imported images as URLs. Tests only need their module values.
registerHooks({
    load(url, context, nextLoad) {
        if (!url.endsWith('.webp')) return nextLoad(url, context);
        return { format: 'module', source: 'export default ' + JSON.stringify(url), shortCircuit: true };
    },
});
