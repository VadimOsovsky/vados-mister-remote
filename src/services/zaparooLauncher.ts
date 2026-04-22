import type { PlatformDef } from '../types';
import type { WizzoApi } from './wizzoApi';

const ZAPAROO_PORT = 7497;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function buildMglXml(setname: string, rbf: string, romPath: string): string {
  return `<setname same_dir="1">${setname}</setname><rbf>${rbf}</rbf><file delay="2" type="f" index="0" path="${escapeXml(romPath)}"/>`;
}

async function zaparooLaunchMgl(host: string, mglXml: string): Promise<void> {
  const url = `http://${host}:${ZAPAROO_PORT}/api`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'launch',
      params: { text: `mister.mgl:${mglXml}` },
    }),
  });
  if (!res.ok) throw new Error(`Zaparoo HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'Zaparoo RPC error');
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
