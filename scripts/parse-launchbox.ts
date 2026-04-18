import { createWriteStream, createReadStream, mkdirSync, existsSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createUnzip } from 'zlib';
import { join } from 'path';
import { SaxesParser } from 'saxes';
import { Writable, Transform } from 'stream';

// ── Platform mapping ──
const PLATFORM_MAP: Record<string, string> = {
  'Nintendo Entertainment System': 'nes',
  'Super Nintendo Entertainment System': 'snes',
  'Sega Genesis': 'genesis',
  'Sega Mega Drive': 'genesis',
  'Nintendo Game Boy': 'gb',
  'Nintendo Game Boy Advance': 'gba',
  'Sony Playstation': 'ps1',
  'Sony PlayStation': 'ps1',
  'NEC TurboGrafx-16': 'tg16',
  'SNK Neo Geo AES': 'neogeo',
  'SNK Neo Geo MVS': 'neogeo',
  'Nintendo Famicom Disk System': 'fds',
};

const WANTED_IMAGE_TYPES = new Set(['Box - Front', 'Box - Back', 'Screenshot - Gameplay']);

interface RawGame {
  DatabaseID: string;
  Name: string;
  Platform: string;
  ReleaseDate: string;
  Genres: string;
  Overview: string;
  Developer: string;
  Publisher: string;
  MaxPlayers: string;
  CommunityRating: string;
  CommunityRatingCount: string;
  ReleaseType: string;
}

interface RawGameImage {
  DatabaseID: string;
  FileName: string;
  Type: string;
  Region: string;
}

interface RegionImages {
  front?: string;
  back?: string;
  screenshot?: string;
}

interface OutputGame {
  id: string;
  title: string;
  year: string;
  genre: string;
  desc: string;
  developer: string;
  publisher: string;
  maxPlayers: string;
  rating: number;
  ratingCount: number;
  images: Record<string, RegionImages>;
}

const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'launchbox');
const METADATA_ZIP = join(import.meta.dirname, '..', '.cache', 'Metadata.zip');
const METADATA_URL = 'https://gamesdb.launchbox-app.com/Metadata.zip';

// ── Download ──
async function downloadMetadata() {
  const cacheDir = join(import.meta.dirname, '..', '.cache');
  mkdirSync(cacheDir, { recursive: true });

  if (existsSync(METADATA_ZIP)) {
    console.log('Using cached Metadata.zip');
    return;
  }

  console.log('Downloading Metadata.zip...');
  const res = await fetch(METADATA_URL);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);

  const fileStream = createWriteStream(METADATA_ZIP);
  // @ts-ignore - Node fetch body is a web ReadableStream
  const reader = res.body.getReader();

  const total = Number(res.headers.get('content-length') || 0);
  let downloaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(value);
    downloaded += value.length;
    if (total > 0) {
      process.stdout.write(`\r  ${(downloaded / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`);
    }
  }
  fileStream.end();
  console.log('\n  Done.');
}

// ── Extract and parse XML from ZIP ──
async function parseMetadataZip(): Promise<{ games: Map<string, RawGame>; images: RawGameImage[] }> {
  console.log('Parsing Metadata.zip...');

  const games = new Map<string, RawGame>();
  const images: RawGameImage[] = [];

  // We need to extract the zip first, then parse the XML
  // Use unzipper or manual approach
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const extractDir = join(import.meta.dirname, '..', '.cache', 'metadata');
  mkdirSync(extractDir, { recursive: true });

  console.log('  Extracting ZIP...');
  await execAsync(`unzip -o "${METADATA_ZIP}" -d "${extractDir}"`, { maxBuffer: 1024 * 1024 * 10 });

  // Find the XML file
  const { readdirSync } = await import('fs');
  const files = readdirSync(extractDir);
  const xmlFile = files.find(f => f === 'Metadata.xml') || files.find(f => f.endsWith('.xml'));
  if (!xmlFile) throw new Error('No XML file found in Metadata.zip');

  const xmlPath = join(extractDir, xmlFile);
  console.log(`  Parsing ${xmlFile}...`);

  return new Promise((resolve, reject) => {
    const parser = new SaxesParser();

    let currentElement = '';
    let currentTag = '';
    let textBuffer = '';
    let currentGame: Partial<RawGame> = {};
    let currentImage: Partial<RawGameImage> = {};
    let inGame = false;
    let inGameImage = false;
    let gameCount = 0;
    let imageCount = 0;

    const gameFields = new Set(['DatabaseID', 'Name', 'Platform', 'ReleaseDate', 'Genres', 'Overview', 'Developer', 'Publisher', 'MaxPlayers', 'CommunityRating', 'CommunityRatingCount', 'ReleaseType']);
    const imageFields = new Set(['DatabaseID', 'FileName', 'Type', 'Region']);

    parser.on('opentag', (node) => {
      currentTag = node.name;
      textBuffer = '';

      if (node.name === 'Game') {
        inGame = true;
        currentGame = {};
      } else if (node.name === 'GameImage') {
        inGameImage = true;
        currentImage = {};
      }
    });

    parser.on('text', (text) => {
      textBuffer += text;
    });

    parser.on('closetag', (node) => {
      const tag = node.name;

      if (inGame && gameFields.has(tag)) {
        (currentGame as any)[tag] = textBuffer.trim();
      } else if (inGameImage && imageFields.has(tag)) {
        (currentImage as any)[tag] = textBuffer.trim();
      }

      if (tag === 'Game' && inGame) {
        inGame = false;
        const g = currentGame as RawGame;
        const platformKey = PLATFORM_MAP[g.Platform];
        if (platformKey && g.DatabaseID && g.Name && (!g.ReleaseType || g.ReleaseType === 'Released')) {
          games.set(g.DatabaseID, { ...g, Platform: platformKey } as RawGame);
          gameCount++;
          if (gameCount % 1000 === 0) {
            process.stdout.write(`\r  Games: ${gameCount}`);
          }
        }
      } else if (tag === 'GameImage' && inGameImage) {
        inGameImage = false;
        const img = currentImage as RawGameImage;
        if (img.DatabaseID && img.FileName && WANTED_IMAGE_TYPES.has(img.Type)) {
          // Only keep images for games we care about
          if (games.has(img.DatabaseID)) {
            images.push(img);
            imageCount++;
          }
        }
      }

      textBuffer = '';
      currentTag = '';
    });

    parser.on('end', () => {
      console.log(`\n  Found ${gameCount} games, ${imageCount} images`);
      resolve({ games, images });
    });

    parser.on('error', (err) => {
      reject(err);
    });

    // Stream the XML file through the parser
    const readStream = createReadStream(xmlPath, { encoding: 'utf-8', highWaterMark: 64 * 1024 });
    readStream.on('data', (chunk: string) => {
      parser.write(chunk);
    });
    readStream.on('end', () => {
      parser.close();
    });
    readStream.on('error', reject);
  });
}

// ── Build output ──
async function buildOutput(games: Map<string, RawGame>, images: RawGameImage[]) {
  console.log('Building output JSON files...');

  // Group images by DatabaseID
  const imagesByGame = new Map<string, RawGameImage[]>();
  for (const img of images) {
    const list = imagesByGame.get(img.DatabaseID) || [];
    list.push(img);
    imagesByGame.set(img.DatabaseID, list);
  }

  // Group games by platform
  const byPlatform = new Map<string, OutputGame[]>();

  for (const [dbId, game] of games) {
    const platform = game.Platform; // already mapped to our key
    const gameImages = imagesByGame.get(dbId) || [];

    const imgMap: OutputGame['images'] = {};
    for (const img of gameImages) {
      const region = img.Region || 'Unknown';
      if (!imgMap[region]) imgMap[region] = {};
      if (img.Type === 'Box - Front' && !imgMap[region].front) imgMap[region].front = img.FileName;
      else if (img.Type === 'Box - Back' && !imgMap[region].back) imgMap[region].back = img.FileName;
      else if (img.Type === 'Screenshot - Gameplay' && !imgMap[region].screenshot) imgMap[region].screenshot = img.FileName;
    }

    const year = game.ReleaseDate ? game.ReleaseDate.substring(0, 4) : '';

    const out: OutputGame = {
      id: dbId,
      title: game.Name,
      year,
      genre: game.Genres || '',
      desc: game.Overview || '',
      developer: game.Developer || '',
      publisher: game.Publisher || '',
      maxPlayers: game.MaxPlayers || '',
      rating: parseFloat(game.CommunityRating) || 0,
      ratingCount: parseInt(game.CommunityRatingCount) || 0,
      images: imgMap,
    };

    const list = byPlatform.get(platform) || [];
    list.push(out);
    byPlatform.set(platform, list);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [platform, platformGames] of byPlatform) {
    // Sort by title
    platformGames.sort((a, b) => a.title.localeCompare(b.title));

    const outPath = join(OUTPUT_DIR, `${platform}.json`);
    await writeFile(outPath, JSON.stringify(platformGames));
    console.log(`  ${platform}.json — ${platformGames.length} games`);
  }

  console.log('Done!');
}

// ── Main ──
async function main() {
  await downloadMetadata();
  const { games, images } = await parseMetadataZip();
  await buildOutput(games, images);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
