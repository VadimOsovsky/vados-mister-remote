import { readFileSync } from 'fs';
import { join } from 'path';

const GAMES: { id: string; platform: string; search: string }[] = [
  { id: 'smb', platform: 'nes', search: 'Super Mario Bros.' },
  { id: 'zelda', platform: 'nes', search: 'The Legend of Zelda' },
  { id: 'megaman2', platform: 'nes', search: 'Mega Man 2' },
  { id: 'contra', platform: 'nes', search: 'Contra' },
  { id: 'castlevania', platform: 'nes', search: 'Castlevania' },
  { id: 'metroid', platform: 'nes', search: 'Metroid' },
  { id: 'punchout', platform: 'nes', search: 'Punch-Out!!' },
  { id: 'smb3', platform: 'nes', search: 'Super Mario Bros. 3' },
  { id: 'kirby', platform: 'nes', search: "Kirby's Adventure" },
  { id: 'smw', platform: 'snes', search: 'Super Mario World' },
  { id: 'lttp', platform: 'snes', search: 'A Link to the Past' },
  { id: 'supermetroid', platform: 'snes', search: 'Super Metroid' },
  { id: 'chronotrigger', platform: 'snes', search: 'Chrono Trigger' },
  { id: 'ff6', platform: 'snes', search: 'Final Fantasy VI' },
  { id: 'dkc', platform: 'snes', search: 'Donkey Kong Country' },
  { id: 'sonic1', platform: 'genesis', search: 'Sonic the Hedgehog' },
  { id: 'sonic2', platform: 'genesis', search: 'Sonic the Hedgehog 2' },
  { id: 'streets2', platform: 'genesis', search: 'Streets of Rage 2' },
  { id: 'shinobi3', platform: 'genesis', search: 'Shinobi III' },
  { id: 'gunstar', platform: 'genesis', search: 'Gunstar Heroes' },
  { id: 'tetris', platform: 'gb', search: 'Tetris' },
  { id: 'pokered', platform: 'gb', search: 'Pokémon Red Version' },
  { id: 'linksawakening', platform: 'gb', search: "Link's Awakening" },
  { id: 'marioland2', platform: 'gb', search: 'Super Mario Land 2' },
  { id: 'metroidfusion', platform: 'gba', search: 'Metroid Fusion' },
  { id: 'minishcap', platform: 'gba', search: 'Minish Cap' },
  { id: 'pokeemerald', platform: 'gba', search: 'Pokémon Emerald' },
  { id: 'advance_wars', platform: 'gba', search: 'Advance Wars' },
  { id: 'ffta', platform: 'gba', search: 'Final Fantasy Tactics Advance' },
  { id: 'ff7', platform: 'ps1', search: 'Final Fantasy VII' },
  { id: 'mgs', platform: 'ps1', search: 'Metal Gear Solid' },
  { id: 'sotn', platform: 'ps1', search: 'Symphony of the Night' },
  { id: 're2', platform: 'ps1', search: 'Resident Evil 2' },
  { id: 'bonk', platform: 'tg16', search: "Bonk's Adventure" },
  { id: 'blazing', platform: 'tg16', search: 'Blazing Lazers' },
  { id: 'ys12', platform: 'tg16', search: 'Ys Book' },
  { id: 'kof98', platform: 'neogeo', search: "King of Fighters '98" },
  { id: 'metalslug', platform: 'neogeo', search: 'Metal Slug' },
  { id: 'samsho2', platform: 'neogeo', search: 'Samurai Shodown II' },
  { id: 'garou', platform: 'neogeo', search: 'Garou' },
];

interface LBGame {
  id: string;
  title: string;
  images: { front?: string; back?: string; screenshot?: string };
}

const LB_DIR = join(import.meta.dirname, '..', 'public', 'launchbox');
const result: Record<string, { front?: string; back?: string }> = {};

for (const game of GAMES) {
  const lbGames: LBGame[] = JSON.parse(readFileSync(join(LB_DIR, `${game.platform}.json`), 'utf-8'));
  const sl = game.search.toLowerCase();

  let match = lbGames.find(g => g.title.toLowerCase() === sl)
    || lbGames.find(g => g.title.toLowerCase().includes(sl))
    || lbGames.find(g => {
        const words = sl.split(' ').filter(w => w.length > 2);
        return words.every(w => g.title.toLowerCase().includes(w));
      });

  if (match?.images.front) {
    result[game.id] = { front: match.images.front, back: match.images.back };
  } else {
    console.error(`❌ ${game.id} not found`);
  }
}

// Output as TS constant
console.log('export const LAUNCHBOX_ART: Record<string, { front?: string; back?: string }> = {');
for (const [id, urls] of Object.entries(result)) {
  const back = urls.back ? `, back: '${urls.back}'` : '';
  console.log(`  '${id}': { front: '${urls.front}'${back} },`);
}
console.log('};');
