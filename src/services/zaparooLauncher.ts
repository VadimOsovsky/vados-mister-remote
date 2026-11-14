import type { PlatformDef } from '../types';
import type { WizzoApi } from './wizzoApi';

const ZAPAROO_PORT = 7497;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function buildMglXml({ setname, rbf, systemType }: NonNullable<PlatformDef['mglConfig']>, romPath: string): string {
  const profile = setname ? `\n   <setname same_dir="1">${escapeXml(setname)}</setname>` : '';
  return `<mistergamedescription>
   <rbf>${escapeXml(rbf)}</rbf>${profile}
   <option name="System Type" value="${systemType}"/>
   <file delay="2" type="f" index="1" path="${escapeXml(romPath)}"/>
</mistergamedescription>
`
}

function zaparooRequest<T>(host: string, method: string, params?: object, signal?: AbortSignal): Promise<T> {
  const url = `ws://${host}:${ZAPAROO_PORT}/api`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    function finish(error: Error | null, result?: T) {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      ws.close();
      if (error) reject(error);
      else resolve(result as T);
    }
    const abort = () => finish(new Error('Zaparoo request aborted'));
    const timeout = setTimeout(() => {
      finish(new Error('Zaparoo WebSocket timeout'));
    }, method === 'media.active' ? 1500 : 10_000);
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });

    ws.onopen = () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data as string);
        if (json?.id !== 1) return;
        if (json.error) {
          finish(new Error(json.error.message ?? 'Zaparoo RPC error'));
        } else {
          finish(null, json.result);
        }
      } catch {
        return;
      }
    };

    ws.onerror = () => finish(new Error('Zaparoo WebSocket connection failed'));
    ws.onclose = () => finish(new Error('Zaparoo WebSocket closed'));
  });
}

export async function getActiveRomPath(host: string, signal?: AbortSignal): Promise<string | undefined> {
  const media = await zaparooRequest<{ mediaPath?: string } | null>(host, 'media.active', undefined, signal);
  return media?.mediaPath;
}

export async function launchGameForPlatform(
  host: string,
  platform: PlatformDef,
  romPath: string,
  wizzoApi: WizzoApi,
): Promise<void> {
  if (platform.mglConfig) {
    await zaparooRequest(host, 'launch', { text: `**mister.mgl:${buildMglXml(platform.mglConfig, romPath)}` });
    return;
  }
  await wizzoApi.launchGame(romPath);
}
