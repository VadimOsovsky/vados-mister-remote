import type { PlatformDef } from '../types';
import type { WizzoApi } from './wizzoApi';

const ZAPAROO_PORT = 7497;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function buildMglXml(setname: string, rbf: string, romPath: string): string {
  return `<mistergamedescription>
   <rbf>${rbf}</rbf>
   <setname same_dir="1">${setname}</setname>
   <file delay="2" type="f" index="1" path="${escapeXml(romPath)}"/>
</mistergamedescription>
`
}

async function zaparooLaunchMgl(host: string, mglXml: string): Promise<void> {
  const url = `ws://${host}:${ZAPAROO_PORT}/api`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Zaparoo WebSocket timeout'));
    }, 10_000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'launch',
        params: { text: `**mister.mgl:${mglXml}` },
      }));
    };

    ws.onmessage = (event) => {
      clearTimeout(timeout);
      try {
        const json = JSON.parse(event.data as string);
        if (json.error) {
          reject(new Error(json.error.message ?? 'Zaparoo RPC error'));
        } else {
          resolve();
        }
      } catch {
        resolve();
      }
      ws.close();
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Zaparoo WebSocket connection failed'));
    };
  });
}

export async function launchGameForPlatform(
  host: string,
  platform: PlatformDef,
  romPath: string,
  wizzoApi: WizzoApi,
): Promise<void> {
  if (platform.mglConfig) {
    try {
      const xml = buildMglXml(platform.mglConfig.setname, platform.mglConfig.rbf, romPath);
      await zaparooLaunchMgl(host, xml);
      return;
    } catch (err) {
      console.warn('Zaparoo MGL launch failed, falling back to Wizzo:', err);
    }
  }
  await wizzoApi.launchGame(romPath);
}
