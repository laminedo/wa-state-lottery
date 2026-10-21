'use strict';
/**
 * Washington State Lottery — Game Configurations, Seeded Draw History,
 * Statistical Generator Engine, and Official Prize Tier Verification.
 */
(function (globalScope) {
  const WA_GAMES = {
    walotto: {
      id: 'walotto',
      name: 'WA Lotto',
      fullName: 'Washington Lotto',
      badge: 'WA',
      tagline: 'Washington State Flagship Jackpot Game · 2 Plays for $1',
      pickCount: 6,
      drawnCount: 6,
      minNum: 1,
      maxNum: 49,
      hasBonus: false,
      ordered: false,
      allowRepeat: false,
      ticketPrice: 0.5, // $1 for 2 plays
      priceLabel: '$1 for 2 plays',
      drawDays: [1, 3, 6], // Mon, Wed, Sat
      drawScheduleLabel: 'Mon, Wed & Sat · 8:00 PM PT',
      color: '#00e5a0',
      startingJackpot: 1000000, // live amount comes from data/wa-lottery.json
      oddsLabel: '1 in 6,991,908 (for 2 plays)',
      prizeTiers: [
        { match: 6, bonus: false, label: 'Match 6 of 6 — Jackpot', prize: 1000000, isJackpot: true, prizeText: 'JACKPOT' },
        { match: 5, bonus: false, label: 'Match 5 of 6', prize: 1000, prizeText: '$1,000' },
        { match: 4, bonus: false, label: 'Match 4 of 6', prize: 30, prizeText: '$30' },
        { match: 3, bonus: false, label: 'Match 3 of 6', prize: 3, prizeText: '$3' }
      ]
    },

    hit5: {
      id: 'hit5',
      name: 'Hit 5',
      fullName: 'Washington Hit 5',
      badge: 'H5',
      tagline: 'Daily Washington Cashpot Game · Pick 5 from 1–42',
      pickCount: 5,
      drawnCount: 5,
      minNum: 1,
      maxNum: 42,
      hasBonus: false,
      ordered: false,
      allowRepeat: false,
      ticketPrice: 1,
      priceLabel: '$1 per play',
      drawDays: [0, 1, 2, 3, 4, 5, 6], // Daily
      drawScheduleLabel: 'Daily · 8:00 PM PT',
      color: '#3fd0ff',
      startingJackpot: 100000,
      oddsLabel: '1 in 850,668',
      prizeTiers: [
        { match: 5, bonus: false, label: 'Match 5 of 5 — Cashpot', prize: 100000, isJackpot: true, prizeText: 'CASHPOT' },
        { match: 4, bonus: false, label: 'Match 4 of 5', prize: 150, prizeText: '$150' },
        { match: 3, bonus: false, label: 'Match 3 of 5', prize: 15, prizeText: '$15' },
        { match: 2, bonus: false, label: 'Match 2 of 5', prize: 1, prizeText: 'Free Hit 5 Ticket' }
      ]
    },

    match4: {
      id: 'match4',
      name: 'Match 4',
      fullName: 'Washington Match 4',
      badge: 'M4',
      tagline: 'Best Top-Prize Odds in WA · Pick 4 from 1–24 for $10,000',
      pickCount: 4,
      drawnCount: 4,
      minNum: 1,
      maxNum: 24,
      hasBonus: false,
      ordered: false,
      allowRepeat: false,
      ticketPrice: 2,
      priceLabel: '$2 per play',
      drawDays: [0, 1, 2, 3, 4, 5, 6],
      drawScheduleLabel: 'Daily · 8:00 PM PT',
      color: '#f5c542',
      topPrizeLabel: '$10,000',
      oddsLabel: '1 in 10,626',
      prizeTiers: [
        { match: 4, bonus: false, label: 'Match 4 of 4 — Top Prize', prize: 10000, isJackpot: true, prizeText: '$10,000 TOP PRIZE' },
        { match: 3, bonus: false, label: 'Match 3 of 4', prize: 20, prizeText: '$20' },
        { match: 2, bonus: false, label: 'Match 2 of 4', prize: 2, prizeText: '$2' }
      ]
    },

    pick3: {
      id: 'pick3',
      name: 'Pick 3',
      fullName: 'Washington Pick 3',
      badge: 'P3',
      tagline: 'Daily 3-Digit Game · Pick 3 Digits (0–9) Exact or Any Order',
      pickCount: 3,
      drawnCount: 3,
      minNum: 0,
      maxNum: 9,
      hasBonus: false,
      ordered: true,
      allowRepeat: true,
      ticketPrice: 1,
      priceLabel: '$1 per play ($0.50 min)',
      drawDays: [0, 1, 2, 3, 4, 5, 6],
      drawScheduleLabel: 'Daily · 8:00 PM PT',
      color: '#a78bfa',
      topPrizeLabel: '$500',
      oddsLabel: '1 in 1,000 (Exact)',
      prizeTiers: [
        { match: 3, exact: true, label: 'Exact Order (Straight)', prize: 500, isJackpot: true, prizeText: '$500 (Exact Order)' },
        { match: 3, exact: false, box3Way: true, label: 'Any Order (3-Way Box)', prize: 160, prizeText: '$160 (3-Way Box)' },
        { match: 3, exact: false, box6Way: true, label: 'Any Order (6-Way Box)', prize: 80, prizeText: '$80 (6-Way Box)' },
        { match: 2, pair: true, label: 'Front / Back Pair (Exact 2)', prize: 50, prizeText: '$50 (Pair)' }
      ]
    },

    keno: {
      id: 'keno',
      name: 'Daily Keno',
      fullName: 'Washington Daily Keno (10-Spot)',
      badge: 'KN',
      tagline: 'Pick 10 Numbers from 1–80 · 20 Numbers Drawn Daily · Top Prize $500K',
      pickCount: 10,
      drawnCount: 20,
      minNum: 1,
      maxNum: 80,
      hasBonus: false,
      ordered: false,
      allowRepeat: false,
      ticketPrice: 1,
      priceLabel: '$1 per play ($500K max)',
      drawDays: [0, 1, 2, 3, 4, 5, 6],
      drawScheduleLabel: 'Daily · 8:00 PM PT',
      color: '#fb923c',
      topPrizeLabel: '$100,000',
      oddsLabel: '1 in 9.05 overall (10-Spot)',
      prizeTiers: [
        { match: 10, bonus: false, label: 'Match 10 of 10 (10-Spot)', prize: 100000, isJackpot: true, prizeText: '$100,000' },
        { match: 9, bonus: false, label: 'Match 9 of 10', prize: 5000, prizeText: '$5,000' },
        { match: 8, bonus: false, label: 'Match 8 of 10', prize: 500, prizeText: '$500' },
        { match: 7, bonus: false, label: 'Match 7 of 10', prize: 50, prizeText: '$50' },
        { match: 6, bonus: false, label: 'Match 6 of 10', prize: 5, prizeText: '$5' },
        { match: 5, bonus: false, label: 'Match 5 of 10', prize: 2, prizeText: '$2' },
        { match: 0, bonus: false, label: 'Match 0 of 10', prize: 3, prizeText: '$3 (Catch Zero)' }
      ]
    },

    powerball: {
      id: 'powerball',
      name: 'Powerball',
      fullName: 'Washington Powerball',
      badge: 'PB',
      tagline: 'Multi-State Giant Jackpot · 5 White Balls (1–69) + Powerball (1–26)',
      pickCount: 5,
      drawnCount: 5,
      minNum: 1,
      maxNum: 69,
      hasBonus: true,
      bonusName: 'Powerball',
      bonusShort: 'PB',
      bonusMin: 1,
      bonusMax: 26,
      ordered: false,
      allowRepeat: false,
      ticketPrice: 2,
      priceLabel: '$2 per play',
      drawDays: [1, 3, 6], // Mon, Wed, Sat
      drawScheduleLabel: 'Mon, Wed & Sat · 7:59 PM PT',
      color: '#ff5d73',
      startingJackpot: 20000000,
      oddsLabel: '1 in 292,201,338',
      nyApiUrl: 'https://data.ny.gov/resource/d6yy-54nr.json?$limit=10&$order=draw_date%20DESC',
      prizeTiers: [
        { match: 5, bonus: true, label: '5 + Powerball — Grand Prize', prize: 20000000, isJackpot: true, prizeText: 'JACKPOT' },
        { match: 5, bonus: false, label: '5 White Balls', prize: 1000000, prizeText: '$1,000,000' },
        { match: 4, bonus: true, label: '4 + Powerball', prize: 50000, prizeText: '$50,000' },
        { match: 4, bonus: false, label: '4 White Balls', prize: 100, prizeText: '$100' },
        { match: 3, bonus: true, label: '3 + Powerball', prize: 100, prizeText: '$100' },
        { match: 3, bonus: false, label: '3 White Balls', prize: 7, prizeText: '$7' },
        { match: 2, bonus: true, label: '2 + Powerball', prize: 7, prizeText: '$7' },
        { match: 1, bonus: true, label: '1 + Powerball', prize: 4, prizeText: '$4' },
        { match: 0, bonus: true, label: 'Powerball Only', prize: 4, prizeText: '$4' }
      ]
    },

    mega: {
      id: 'mega',
      name: 'Mega Millions',
      fullName: 'Washington Mega Millions',
      badge: 'MM',
      tagline: 'Multi-State Jackpot · 5 White Balls (1–70) + Mega Ball (1–24) · 2×–10× Multiplier on Every Play',
      pickCount: 5,
      drawnCount: 5,
      minNum: 1,
      maxNum: 70,
      hasBonus: true,
      bonusName: 'Mega Ball',
      bonusShort: 'MB',
      bonusMin: 1,
      bonusMax: 24,
      ordered: false,
      allowRepeat: false,
      ticketPrice: 5,
      priceLabel: '$5 per play',
      drawDays: [2, 5], // Tue, Fri
      drawScheduleLabel: 'Tue & Fri · 8:00 PM PT',
      color: '#facc15',
      startingJackpot: 50000000,
      oddsLabel: '1 in 290,472,336',
      nyApiUrl: 'https://data.ny.gov/resource/5xaw-6ayf.json?$limit=10&$order=draw_date%20DESC',
      prizeTiers: [
        { match: 5, bonus: true, label: '5 + Mega Ball — Jackpot', prize: 50000000, isJackpot: true, prizeText: 'JACKPOT' },
        { match: 5, bonus: false, label: '5 White Balls', prize: 1000000, prizeText: '$1,000,000' },
        { match: 4, bonus: true, label: '4 + Mega Ball', prize: 10000, prizeText: '$10,000' },
        { match: 4, bonus: false, label: '4 White Balls', prize: 500, prizeText: '$500' },
        { match: 3, bonus: true, label: '3 + Mega Ball', prize: 200, prizeText: '$200' },
        { match: 3, bonus: false, label: '3 White Balls', prize: 10, prizeText: '$10' },
        { match: 2, bonus: true, label: '2 + Mega Ball', prize: 10, prizeText: '$10' },
        { match: 1, bonus: true, label: '1 + Mega Ball', prize: 7, prizeText: '$7' },
        { match: 0, bonus: true, label: 'Mega Ball Only', prize: 5, prizeText: '$5' }
      ]
    }
  };

  const GENERATOR_STRATEGIES = {
    quickpick: {
      id: 'quickpick',
      name: 'Quick Pick (Crypto RNG)',
      shortName: 'Quick Pick',
      badge: 'Uniform Random',
      description: 'Cryptographically uniform random selection using Web Crypto API — identical to a Washington Lottery terminal Quick Pick.'
    },
    balanced: {
      id: 'balanced',
      name: 'Smart Balanced',
      shortName: 'Balanced',
      badge: 'Sum + Odd/Even + Spread',
      description: 'Targets the historical bell-curve sum range, balanced odd/even split, low/high spread, and avoids already-drawn jackpot combinations.'
    },
    hot: {
      id: 'hot',
      name: 'Hot Frequency',
      shortName: 'Hot Numbers',
      badge: 'Frequency Weighted',
      description: 'Weights balls toward the most frequently drawn numbers in Washington draw history while maintaining spread.'
    },
    cold: {
      id: 'cold',
      name: 'Cold / Overdue',
      shortName: 'Cold Overdue',
      badge: 'Longest Gap Weighted',
      description: 'Favors overdue numbers that have gone the longest number of drawings without appearing.'
    },
    contrarian: {
      id: 'contrarian',
      name: 'High Entropy (Anti-Crowd)',
      shortName: 'Anti-Crowd',
      badge: 'Avoid Calendar Bias',
      description: 'Biases toward higher numbers (>31 where applicable) and non-arithmetic spacing to reduce split-pot risk if a jackpot hits.'
    }
  };

  /* Cryptographically unbiased random integer in [min, max] */
  function cryptoRandInt(min, max) {
    const range = max - min + 1;
    if (range <= 1) return min;
    if (globalScope.crypto && globalScope.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      globalScope.crypto.getRandomValues(arr);
      return min + (arr[0] % range);
    }
    return Math.floor(Math.random() * range) + min;
  }

  /* Compute frequency & gap stats for a game's draw history */
  function analyzeDraws(game, draws) {
    const freq = {};
    const lastSeen = {};
    for (let n = game.minNum; n <= game.maxNum; n++) {
      freq[n] = 0;
      lastSeen[n] = draws.length;
    }

    draws.forEach((draw, idx) => {
      (draw.numbers || []).forEach((n) => {
        if (n >= game.minNum && n <= game.maxNum) {
          freq[n] = (freq[n] || 0) + 1;
          if (idx < lastSeen[n]) lastSeen[n] = idx;
        }
      });
    });

    const bonusFreq = {};
    const bonusLastSeen = {};
    if (game.hasBonus) {
      for (let b = game.bonusMin; b <= game.bonusMax; b++) {
        bonusFreq[b] = 0;
        bonusLastSeen[b] = draws.length;
      }
      draws.forEach((draw, idx) => {
        const b = draw.bonus;
        if (b >= game.bonusMin && b <= game.bonusMax) {
          bonusFreq[b] = (bonusFreq[b] || 0) + 1;
          if (idx < bonusLastSeen[b]) bonusLastSeen[b] = idx;
        }
      });
    }

    const items = [];
    for (let n = game.minNum; n <= game.maxNum; n++) {
      items.push({
        number: n,
        count: freq[n] || 0,
        gap: lastSeen[n] ?? draws.length
      });
    }

    const sortedByHot = [...items].sort((a, b) => b.count - a.count || a.gap - b.gap);
    const sortedByCold = [...items].sort((a, b) => b.gap - a.gap || a.count - b.count);

    return {
      freq,
      lastSeen,
      bonusFreq,
      bonusLastSeen,
      items,
      hotNumbers: sortedByHot.slice(0, Math.min(8, items.length)).map((x) => x.number),
      coldNumbers: sortedByCold.slice(0, Math.min(8, items.length)).map((x) => x.number)
    };
  }

  /* Generate a single line of numbers using the selected strategy and optional locked/excluded numbers */
  function generateLine(game, draws, strategyId = 'quickpick', options = {}) {
    const stats = analyzeDraws(game, draws);
    const locked = (options.locked || []).filter((n) => n >= game.minNum && n <= game.maxNum);
    const excluded = new Set((options.excluded || []).filter((n) => !locked.includes(n)));

    const buildCandidate = () => {
      const pool = [];
      for (let n = game.minNum; n <= game.maxNum; n++) {
        if (excluded.has(n)) continue;
        let weight = 1;
        if (strategyId === 'hot') {
          weight = 1 + (stats.freq[n] || 0) * 3;
        } else if (strategyId === 'cold') {
          weight = 1 + (stats.lastSeen[n] || 0) * 2;
        } else if (strategyId === 'contrarian') {
          weight = n > 31 ? 4 : 1;
        } else if (strategyId === 'balanced') {
          weight = 2 + (stats.freq[n] || 0) + Math.min(4, stats.lastSeen[n] || 0);
        }
        for (let w = 0; w < weight; w++) pool.push(n);
      }

      // Fallback if user excluded too many numbers
      if (pool.length < game.pickCount) {
        for (let n = game.minNum; n <= game.maxNum; n++) pool.push(n);
      }

      if (game.allowRepeat) {
        const result = [...locked.slice(0, game.pickCount)];
        while (result.length < game.pickCount) {
          result.push(pool[cryptoRandInt(0, pool.length - 1)]);
        }
        return game.ordered ? result : result.sort((a, b) => a - b);
      } else {
        const chosen = new Set(locked.slice(0, game.pickCount));
        let guard = 0;
        while (chosen.size < game.pickCount && guard < 600) {
          guard++;
          chosen.add(pool[cryptoRandInt(0, pool.length - 1)]);
        }
        while (chosen.size < game.pickCount) {
          chosen.add(cryptoRandInt(game.minNum, game.maxNum));
        }
        return [...chosen].sort((a, b) => a - b);
      }
    };

    let bestNumbers = buildCandidate();
    if (strategyId === 'balanced' && !game.ordered) {
      // Score 25 candidate combinations for optimal odd/even balance and mid-bell sum
      const expectedSingle = (game.minNum + game.maxNum) / 2;
      const expectedSum = expectedSingle * game.pickCount;
      let bestScore = -Infinity;

      for (let i = 0; i < 25; i++) {
        const cand = buildCandidate();
        const sum = cand.reduce((a, b) => a + b, 0);
        const sumDiff = Math.abs(sum - expectedSum) / expectedSum;
        const odds = cand.filter((n) => n % 2 !== 0).length;
        const idealOdds = game.pickCount / 2;
        const oddDiff = Math.abs(odds - idealOdds);
        const score = 100 - sumDiff * 60 - oddDiff * 12;
        if (score > bestScore) {
          bestScore = score;
          bestNumbers = cand;
        }
      }
    }

    let bonus = null;
    if (game.hasBonus) {
      if (options.lockedBonus && options.lockedBonus >= game.bonusMin && options.lockedBonus <= game.bonusMax) {
        bonus = options.lockedBonus;
      } else if (strategyId === 'hot') {
        const bPool = [];
        for (let b = game.bonusMin; b <= game.bonusMax; b++) {
          const w = 1 + (stats.bonusFreq[b] || 0) * 2;
          for (let k = 0; k < w; k++) bPool.push(b);
        }
        bonus = bPool[cryptoRandInt(0, bPool.length - 1)];
      } else if (strategyId === 'cold') {
        const bPool = [];
        for (let b = game.bonusMin; b <= game.bonusMax; b++) {
          const w = 1 + (stats.bonusLastSeen[b] || 0) * 2;
          for (let k = 0; k < w; k++) bPool.push(b);
        }
        bonus = bPool[cryptoRandInt(0, bPool.length - 1)];
      } else {
        bonus = cryptoRandInt(game.bonusMin, game.bonusMax);
      }
    }

    const hotSet = new Set(stats.hotNumbers.slice(0, 5));
    const hotMatched = bestNumbers.filter((n) => hotSet.has(n));
    const sum = bestNumbers.reduce((a, b) => a + b, 0);
    const odds = bestNumbers.filter((n) => n % 2 !== 0).length;
    const evens = bestNumbers.length - odds;

    return {
      numbers: bestNumbers,
      bonus,
      sum,
      oddEven: `${odds}O / ${evens}E`,
      hotNumbers: hotMatched,
      strategyId
    };
  }

  /* Verify a user line against a specific draw for any WA game */
  function verifyLineAgainstDraw(line, draw, game) {
    if (!draw || !Array.isArray(draw.numbers) || !Array.isArray(line.numbers)) {
      return {
        isWin: false,
        matchedNumbers: [],
        matchedIndices: [],
        matchedBonus: false,
        matchCount: 0,
        prize: 0,
        prizeText: '$0',
        tierLabel: 'No Match',
        isJackpot: false
      };
    }

    // Special handling for Pick 3 (ordered digits 0-9)
    if (game.id === 'pick3') {
      const u = line.numbers;
      const d = draw.numbers;
      const matchedIndices = [];
      for (let i = 0; i < 3; i++) {
        if (u[i] === d[i]) matchedIndices.push(i);
      }
      const isExact = matchedIndices.length === 3;
      const uSorted = [...u].sort((a, b) => a - b).join(',');
      const dSorted = [...d].sort((a, b) => a - b).join(',');
      const isAnyOrder = uSorted === dSorted;
      const frontPair = u[0] === d[0] && u[1] === d[1];
      const backPair = u[1] === d[1] && u[2] === d[2];

      // Count how many digits matched in any order
      const dCopy = [...d];
      const matchedNumbers = [];
      u.forEach((digit) => {
        const idx = dCopy.indexOf(digit);
        if (idx !== -1) {
          matchedNumbers.push(digit);
          dCopy.splice(idx, 1);
        }
      });

      if (isExact) {
        return {
          isWin: true,
          matchedNumbers,
          matchedIndices: [0, 1, 2],
          matchedBonus: false,
          matchCount: 3,
          prize: 500,
          prizeText: '$500',
          tierLabel: 'Exact Order (Straight)',
          isJackpot: true
        };
      }
      if (isAnyOrder) {
        const uniqueCount = new Set(u).size;
        const is3Way = uniqueCount === 2;
        return {
          isWin: true,
          matchedNumbers,
          matchedIndices,
          matchedBonus: false,
          matchCount: 3,
          prize: is3Way ? 160 : 80,
          prizeText: is3Way ? '$160' : '$80',
          tierLabel: is3Way ? 'Any Order (3-Way Box)' : 'Any Order (6-Way Box)',
          isJackpot: false
        };
      }
      if (frontPair || backPair) {
        return {
          isWin: true,
          matchedNumbers,
          matchedIndices,
          matchedBonus: false,
          matchCount: 2,
          prize: 50,
          prizeText: '$50',
          tierLabel: frontPair ? 'Front Pair (Exact 2)' : 'Back Pair (Exact 2)',
          isJackpot: false
        };
      }
      return {
        isWin: false,
        matchedNumbers,
        matchedIndices,
        matchedBonus: false,
        matchCount: matchedNumbers.length,
        prize: 0,
        prizeText: '$0',
        tierLabel: 'No Winning Combo',
        isJackpot: false
      };
    }

    // Standard unordered ball games (WA Lotto, Hit 5, Match 4, Daily Keno, Powerball, Mega Millions)
    const drawnSet = new Set(draw.numbers);
    const matchedNumbers = line.numbers.filter((n) => drawnSet.has(n));
    const matchCount = matchedNumbers.length;
    const matchedBonus = Boolean(game.hasBonus && line.bonus != null && draw.bonus === line.bonus);

    for (const tier of game.prizeTiers) {
      const bonusMatches = game.hasBonus ? tier.bonus === matchedBonus : true;
      if (tier.match === matchCount && bonusMatches) {
        return {
          isWin: true,
          matchedNumbers,
          matchedIndices: [],
          matchedBonus,
          matchCount,
          prize: tier.prize,
          prizeText: tier.prizeText,
          tierLabel: tier.label,
          isJackpot: Boolean(tier.isJackpot)
        };
      }
    }

    return {
      isWin: false,
      matchedNumbers,
      matchedIndices: [],
      matchedBonus,
      matchCount,
      prize: 0,
      prizeText: '$0',
      tierLabel: 'No Prize Tier',
      isJackpot: false
    };
  }

  /* Compute the next scheduled draw date string for a WA game */
  function getNextDrawDate(game) {
    // Draws happen at ~8 PM Pacific, so work in Pacific time regardless of the viewer's zone.
    const pacific = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    for (let i = 0; i <= 7; i++) {
      const candidate = new Date(pacific);
      candidate.setDate(pacific.getDate() + i);
      if (game.drawDays.includes(candidate.getDay())) {
        // If today is a draw day and it's already past 8 PM PT, the next draw is a later day
        if (i === 0 && pacific.getHours() >= 20) continue;
        return candidate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }
    return 'Upcoming Draw';
  }

  globalScope.WALotteryEngine = {
    WA_GAMES,
    GENERATOR_STRATEGIES,
    cryptoRandInt,
    analyzeDraws,
    generateLine,
    verifyLineAgainstDraw,
    getNextDrawDate
  };
})(window);
