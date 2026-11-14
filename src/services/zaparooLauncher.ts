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
      try {
        const json = JSON.parse(event.data as string);
        if (json?.id !== 1) return;
        clearTimeout(timeout);
        if (json.error) {
          reject(new Error(json.error.message ?? 'Zaparoo RPC error'));
        } else {
          resolve();
        }
      } catch {
        return;
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
    await zaparooLaunchMgl(host, buildMglXml(platform.mglConfig, romPath));
    return;
  }
  await wizzoApi.launchGame(romPath);
}
