#!/usr/bin/env node
/**
 * Scrapes official results and current jackpots from walottery.com and writes
 * data/wa-lottery.json, which the site loads on startup.
 *
 * walottery.com does not allow cross-origin reads from other sites, so this
 * runs server-side (GitHub Actions, see .github/workflows/update-lottery-data.yml).
 * Zero dependencies — requires Node 18+ for global fetch.
 *
 * Usage: node scripts/fetch-lottery-data.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = resolve(ROOT, 'data/wa-lottery.json');
const BASE = 'https://www.walottery.com';
const HISTORY_DAYS = 180; // walottery.com only accepts 30 or 180 for unittype=day

// app game id → walottery.com identifiers
const GAMES = {
  walotto: { slug: 'lotto', bucket: 'lotto', sortNumbers: true, hasJackpotRow: true },
  hit5: { slug: 'hit5', bucket: 'hit5', sortNumbers: true, hasJackpotRow: true },
  match4: { slug: 'match4', sortNumbers: true },
  pick3: { slug: 'pick3', sortNumbers: false },
  keno: { slug: 'dailykeno', sortNumbers: true },
  powerball: { slug: 'powerball', bucket: 'powerball', sortNumbers: true, hasJackpotRow: true },
  mega: { slug: 'megamillions', bucket: 'megamillions', sortNumbers: true, hasJackpotRow: true }
};

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

async function fetchHtml(path) {
  const res = await fetch(BASE + path, {
    headers: { 'user-agent': 'wa-state-lottery-data-bot (+https://github.com/laminedo/wa-state-lottery)' },
    redirect: 'manual' // invalid query params redirect to an error page
  });
  if (res.status !== 200) throw new Error(`${path} → HTTP ${res.status}`);
  return res.text();
}

const decode = (s) =>
  s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#42;/g, '*').replace(/\s+/g, ' ').trim();

function parseDate(text) {
  // "Mon, Oct 19, 2026" → "2026-10-19"
  const m = /([A-Z][a-z]{2})[a-z]* (\d{1,2}), (\d{4})/.exec(text);
  if (!m || !MONTHS[m[1]]) return null;
  return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

const parseMoney = (text) => {
  const m = /\$([\d,]+(?:\.\d+)?)\s*(Million|Billion)?/i.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  const scale = /billion/i.test(m[2] || '') ? 1e9 : /million/i.test(m[2] || '') ? 1e6 : 1;
  return Math.round(n * scale);
};

/** Past Drawings page → [{ date, numbers, bonus?, mult?, jackpotValue? }] newest first */
function parsePastDrawings(html, cfg) {
  const draws = [];
  const seen = new Set();
  // Each draw appears twice (small + large viewport tables); take the small one.
  const blocks = html.split('<table class="table-viewport-small">').slice(1);
  for (const block of blocks) {
    const end = block.indexOf('<table class="table-viewport-large">');
    const body = end > -1 ? block.slice(0, end) : block;

    const date = parseDate(decode((/<p class="h2-like">([\s\S]*?)<\/p>/.exec(body) || [])[1] || ''));
    const ballsHtml = (/<td class="game-balls">([\s\S]*?)<\/td>/.exec(body) || [])[1] || '';
    if (!date || seen.has(date)) continue;

    const numbers = [];
    let bonus = null;
    for (const li of ballsHtml.matchAll(/<li([^>]*)>\s*(\d+)\s*<\/li>/g)) {
      if (/game-ball-/.test(li[1])) bonus = Number(li[2]);
      else numbers.push(Number(li[2]));
    }
    if (!numbers.length) continue;
    if (cfg.sortNumbers) numbers.sort((a, b) => a - b);

    const draw = { date, numbers };
    if (bonus != null) draw.bonus = bonus;

    const mult = /game-multiplier[^>]*>[\s\S]*?x0*(\d+)/.exec(ballsHtml);
    if (mult) draw.mult = Number(mult[1]);

    if (cfg.hasJackpotRow) {
      // First prize row of the per-draw prize table is the jackpot for that draw.
      const firstRow = /<tbody>\s*<tr>([\s\S]*?)<\/tr>/.exec(body.slice(body.indexOf('Prize Amount')));
      const value = firstRow ? parseMoney(decode(firstRow[1])) : null;
      if (value) draw.jackpotValue = value;
    }

    seen.add(date);
    draws.push(draw);
  }
  return draws.sort((a, b) => b.date.localeCompare(a.date));
}

const todayInPacific = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

/** "TONIGHT" or "FRI/OCT 23" (relative to now, Pacific time) → "2026-10-23" */
function parseNextDraw(text) {
  if (!text) return null;
  const today = todayInPacific();
  if (/tonight|today/i.test(text)) return today;
  const m = /([A-Z]{3})\s*(\d{1,2})\s*$/i.exec(text);
  const month = m && MONTHS[m[1][0].toUpperCase() + m[1].slice(1, 3).toLowerCase()];
  if (!month) return null;
  let year = Number(today.slice(0, 4));
  if (month < Number(today.slice(5, 7))) year += 1; // e.g. a Jan draw seen in Dec
  return `${year}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/** Homepage game buckets → { [bucket]: { jackpotValue, cashValue, nextDraw } } */
function parseHomepageJackpots(html) {
  const out = {};
  for (const m of html.matchAll(/<div class="game-bucket game-bucket-([a-z0-9]+)"([\s\S]*?)<\/footer>/g)) {
    const [, bucket, body] = m;
    // Powerball's bucket also contains the Double Play amount; the first h3 is the main jackpot.
    const amount = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(body);
    const cash = /Cash Option\s*<strong>([\s\S]*?)<\/strong>/.exec(body);
    const next = /Next Draw:\s*<strong>([\s\S]*?)<\/strong>/.exec(body);
    out[bucket] = {
      jackpotValue: amount ? parseMoney(decode(amount[1])) : null,
      cashValue: cash ? parseMoney(decode(cash[1])) : null,
      nextDrawDate: next ? parseNextDraw(decode(next[1])) : null
    };
  }
  return out;
}

/** JSON with one draw per line — compact but still readable in git diffs. */
function serialize(data) {
  const games = Object.entries(data.games).map(([id, g]) => {
    const { draws, ...meta } = g;
    const metaJson = Object.entries(meta).map(([k, v]) => `   ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
    return `  ${JSON.stringify(id)}: {\n${metaJson}\n   "draws": [\n${draws.map((d) => `    ${JSON.stringify(d)}`).join(',\n')}\n   ]\n  }`;
  });
  return `{\n "updatedAt": ${JSON.stringify(data.updatedAt)},\n "source": ${JSON.stringify(data.source)},\n "games": {\n${games.join(',\n')}\n }\n}\n`;
}

async function main() {
  const previous = await readFile(OUT_FILE, 'utf8').then(JSON.parse).catch(() => null);
  const homepage = parseHomepageJackpots(await fetchHtml('/'));
  const games = {};
  const errors = [];

  for (const [id, cfg] of Object.entries(GAMES)) {
    try {
      const html = await fetchHtml(`/WinningNumbers/PastDrawings.aspx?gamename=${cfg.slug}&unittype=day&unitcount=${HISTORY_DAYS}`);
      const draws = parsePastDrawings(html, cfg);
      if (!draws.length) throw new Error('no draws parsed — page layout may have changed');
      const live = cfg.bucket ? homepage[cfg.bucket] || {} : {};
      games[id] = {
        jackpotValue: live.jackpotValue ?? null,
        cashValue: live.cashValue ?? null,
        nextDrawDate: live.nextDrawDate ?? null,
        draws
      };
      console.log(`${id}: ${draws.length} draws, latest ${draws[0].date} [${draws[0].numbers.join(' ')}]` +
        (draws[0].bonus != null ? ` + ${draws[0].bonus}` : '') +
        (live.jackpotValue ? `, next jackpot $${live.jackpotValue.toLocaleString('en-US')}` : ''));
    } catch (err) {
      errors.push(`${id}: ${err.message}`);
      // Keep the last good data for this game rather than dropping it.
      if (previous?.games?.[id]) games[id] = previous.games[id];
    }
  }

  if (!Object.keys(games).length) throw new Error(`All games failed:\n${errors.join('\n')}`);

  // Only rewrite the file when results or jackpots actually changed, so the
  // scheduled workflow doesn't create a commit every run.
  if (previous && JSON.stringify(previous.games) === JSON.stringify(games)) {
    console.log('No changes.');
  } else {
    await mkdir(dirname(OUT_FILE), { recursive: true });
    const data = { updatedAt: new Date().toISOString(), source: BASE, games };
    await writeFile(OUT_FILE, serialize(data));
    console.log(`Wrote ${OUT_FILE}`);
  }

  if (errors.length) {
    console.error(`Some games failed:\n${errors.join('\n')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
