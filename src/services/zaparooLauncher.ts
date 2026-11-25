import type { PlatformDef } from '../types';
import type { WizzoApi } from './wizzoApi';

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

function zaparooRequest<T>(url: string, method: string, params?: object, signal?: AbortSignal): Promise<T> {
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

export async function getActiveRomPath(url: string, signal?: AbortSignal): Promise<string | undefined> {
  const media = await zaparooRequest<{ mediaPath?: string } | null>(url, 'media.active', undefined, signal);
  return media?.mediaPath;
}

export async function launchGameForPlatform(
  platform: PlatformDef,
  romPath: string,
  wizzoApi: WizzoApi,
): Promise<void> {
  if (platform.mglConfig) {
    // Send the XML as one ZapScript argument, even if a ROM path contains delimiters.
    const xml = buildMglXml(platform.mglConfig, romPath).trimEnd()
      .replace(/[\^"|[\]\r\n\t]/g, char => `^${({ '\r': 'r', '\n': 'n', '\t': 't' } as Record<string, string>)[char] ?? char}`);
    await zaparooRequest(wizzoApi.zaparooWsUrl, 'launch', { text: `**mister.mgl:"${xml}"` });
    return;
  }
  await wizzoApi.launchGame(romPath);
}
