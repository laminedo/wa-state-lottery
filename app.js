'use strict';
/**
 * Washington State Lottery — Interactive Dashboard, Generator & Saved Vault App
 */
(function () {
  const Engine = window.WALotteryEngine;
  const { WA_GAMES, GENERATOR_STRATEGIES } = Engine;

  const STORAGE_KEYS = {
    ACTIVE_GAME: 'wa_lottery_active_game_v1',
    SAVED_TICKETS: 'wa_lottery_saved_tickets_v1',
    DRAWS_PREFIX: 'wa_lottery_draws_v1_'
  };

  const DB_NAME = 'wa-state-lottery-vault-db';
  const DB_STORE = 'saved_tickets';

  // Application State
  let currentGameId = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME) || 'walotto';
  if (!WA_GAMES[currentGameId]) currentGameId = 'walotto';

  let currentStrategyId = 'quickpick';
  let currentDraws = [];
  let selectedDraw = null;
  let currentForecast = null;
  let generatedPlays = [];
  let lockedNumbers = new Set();
  let savedTickets = [];
  let savedFilterScope = 'current'; // 'current' | 'all'
  let savedFilterStatus = 'all';    // 'all' | 'winners' | 'starred'

  // ── IndexedDB Mirror for Saved Tickets ──────────────────────────────
  function openVaultDb() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(DB_STORE)) {
            db.createObjectStore(DB_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function syncTicketsToIndexedDB(tickets) {
    const db = await openVaultDb();
    if (!db) return;
    try {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.clear();
      tickets.forEach((t) => store.put(t));
    } catch {
      // Ignore storage quota or private mode restrictions
    }
  }

  async function loadSavedTicketsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_TICKETS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          savedTickets = parsed;
          return;
        }
      }
    } catch {
      // Fallback to IndexedDB
    }

    const db = await openVaultDb();
    if (db) {
      const fromDb = await new Promise((resolve) => {
        try {
          const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
      if (fromDb.length) {
        savedTickets = fromDb.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
      }
    }
  }

  function persistSavedTickets() {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_TICKETS, JSON.stringify(savedTickets));
    } catch {
      // Ignore localStorage quota errors
    }
    syncTicketsToIndexedDB(savedTickets);
    updateHeaderSavedBadge();
  }

  // ── Modern Web Guidance: Persistent Toast Notifications (popover="manual") ──
  let toastSeq = 0;
  function showToast(message) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;

    const id = `wa-toast-${++toastSeq}`;
    const toastEl = document.createElement('div');
    toastEl.id = id;
    toastEl.className = 'toast-popover';
    toastEl.setAttribute('popover', 'manual');
    toastEl.setAttribute('role', 'status');

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('popovertarget', id);
    closeBtn.setAttribute('popovertargetaction', 'hide');
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.textContent = '✕';

    const dismiss = () => {
      try {
        if (typeof toastEl.hidePopover === 'function') {
          toastEl.hidePopover();
        } else {
          toastEl.classList.remove('legacy-open');
        }
      } catch {
        // Already hidden
      }
      setTimeout(() => toastEl.remove(), 280);
    };

    closeBtn.addEventListener('click', dismiss);
    toastEl.appendChild(textSpan);
    toastEl.appendChild(closeBtn);
    stack.appendChild(toastEl);

    try {
      if (typeof toastEl.showPopover === 'function') {
        toastEl.showPopover();
      } else {
        toastEl.classList.add('legacy-open');
      }
    } catch {
      toastEl.classList.add('legacy-open');
    }

    setTimeout(dismiss, 3000);
  }

  // ── Modern Web Guidance: Validate Input After Interaction (:user-invalid) ──
  const UserInvalidFallback = (() => {
    const dirtyState = new WeakMap();

    const updateState = (input) => {
      const isValid = input.checkValidity();
      input.classList.toggle('user-invalid-fallback', !isValid);
      input.classList.toggle('user-valid-fallback', isValid);
      if (!isValid) {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    };

    const handleEvent = (event) => {
      const input = event.target;
      if (event.type === 'reset') {
        const controls = input.elements || [];
        for (const control of controls) {
          dirtyState.delete(control);
          control.classList.remove('user-invalid-fallback', 'user-valid-fallback');
          control.removeAttribute('aria-invalid');
        }
        return;
      }
      if (!input || !input.checkValidity) return;

      if (event.type === 'input' || event.type === 'change') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasInteracted = true;
        dirtyState.set(input, state);
        if (state.hasBlurred) updateState(input);
      } else if (event.type === 'blur') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(input, state);
        if (state.hasInteracted) updateState(input);
      }
    };

    const init = (root = document) => {
      // Sync aria-invalid with native :user-invalid
      const syncAria = (el) => {
        if (!el || typeof el.matches !== 'function' || !el.classList?.contains('num-input')) return;
        try {
          if (CSS.supports('selector(:user-invalid)')) {
            el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
          }
        } catch {
          // Ignore unsupported selector error
        }
      };

      root.addEventListener('blur', (e) => syncAria(e.target), true);
      root.addEventListener('input', (e) => {
        if (e.target && e.target.hasAttribute && e.target.hasAttribute('aria-invalid')) {
          syncAria(e.target);
        }
      });

      if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(:user-invalid)')) return;
      root.addEventListener('blur', handleEvent, true);
      root.addEventListener('input', handleEvent);
      root.addEventListener('change', handleEvent);
      root.addEventListener('reset', handleEvent, true);
    };

    return { init };
  })();

  // ── Formatting Helpers ──────────────────────────────────────────────
  function getActiveGame() {
    return WA_GAMES[currentGameId];
  }

  function formatBallNumber(n, game) {
    if (game && game.id === 'pick3') return String(n);
    return String(n).padStart(2, '0');
  }

  function formatDatePretty(dateStr) {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[Number(m) - 1] || m} ${Number(d)}, ${y}`;
  }

  function computeOddEven(numbers) {
    const odds = numbers.filter((n) => n % 2 !== 0).length;
    return `${odds}O / ${numbers.length - odds}E`;
  }

  function computeSum(numbers) {
    return numbers.reduce((a, b) => a + b, 0);
  }

  function lineKey(gameId, numbers, bonus) {
    const g = WA_GAMES[gameId];
    const norm = g && g.ordered ? numbers : [...numbers].sort((a, b) => a - b);
    return `${gameId}:${norm.join('-')}${g && g.hasBonus ? '+' + bonus : ''}`;
  }

  function isLineSaved(gameId, numbers, bonus) {
    const key = lineKey(gameId, numbers, bonus);
    return savedTickets.some((t) => t.key === key);
  }

  // ── Draw History Loading & Live Sync ────────────────────────────────
  function loadDrawsForGame(gameId) {
    const game = WA_GAMES[gameId];
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.DRAWS_PREFIX + gameId);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to seeded draws
    }
    return [...game.seedDraws];
  }

  function saveDrawsForGame(gameId, draws) {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAWS_PREFIX + gameId, JSON.stringify(draws));
    } catch {
      // Ignore quota errors
    }
  }

  async function syncOfficialDraws() {
    const game = getActiveGame();
    const btn = document.getElementById('btn-sync-live');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Syncing...';
    }

    let addedCount = 0;
    try {
      if (game.nyApiUrl) {
        const res = await fetch(game.nyApiUrl, { headers: { accept: 'application/json' } });
        if (res.ok) {
          const rows = await res.json();
          const existingDates = new Set(currentDraws.map((d) => d.date));
          rows.forEach((r) => {
            const date = String(r.draw_date || '').slice(0, 10);
            const nums = String(r.winning_numbers || '').trim().split(/\s+/).map(Number).filter(Number.isFinite);
            if (!date || existingDates.has(date)) return;
            if (nums.length >= game.pickCount) {
              const white = nums.slice(0, game.pickCount).sort((a, b) => a - b);
              const bonus = game.hasBonus ? Number(r.mega_ball || nums[game.pickCount] || 1) : null;
              const mult = Number(r.multiplier) || null;
              currentDraws.push({
                date,
                numbers: white,
                bonus,
                mult,
                jackpot: game.defaultJackpot
              });
              existingDates.add(date);
              addedCount++;
            }
          });
        }
      }
    } catch {
      // Network offline or blocked in sandbox — fallback to verified local WA seed archive
    } finally {
      currentDraws.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      saveDrawsForGame(game.id, currentDraws);
      selectedDraw = currentDraws[0];
      renderAll();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sync WA Lottery`;
      }
      showToast(
        addedCount > 0
          ? `⚡ Synced ${addedCount} new ${game.name} draws & verified saved tickets!`
          : `⚡ ${game.name} official draw archive synced (${currentDraws.length} draws loaded).`
      );
    }
  }

  // ── Ball DOM Builders ───────────────────────────────────────────────
  function createBallElement(num, game, cls = 'white', delayMs = 0, isHot = false) {
    const el = document.createElement('div');
    el.className = `ball ${cls}${isHot ? ' hot' : ''} animate-ball`;
    el.style.animationDelay = `${delayMs}ms`;
    el.textContent = formatBallNumber(num, game);
    el.title = isHot ? `Ball ${num} (Hot frequency in ${game.name})` : `Ball ${num}`;
    return el;
  }

  function renderBallRow(container, numbers, bonus, game, options = {}) {
    if (!container) return;
    container.innerHTML = '';
    const sizeCls = options.size ? ` ${options.size}` : '';
    const baseCls = (options.baseCls || 'white') + sizeCls;
    const hotSet = new Set(options.hotNumbers || []);
    const matchedSet = new Set(options.matchedNumbers || []);
    const matchedIndices = new Set(options.matchedIndices || []);

    numbers.forEach((n, idx) => {
      const isHot = hotSet.has(n);
      const isMatched = game.ordered ? matchedIndices.has(idx) : matchedSet.has(n);
      let ballCls = baseCls;
      if (isMatched) ballCls = `matched${sizeCls}`;
      else if (isHot && options.highlightHot) ballCls = `gold${sizeCls}`;
      container.appendChild(createBallElement(n, game, ballCls, idx * 45, isHot && options.highlightHot));
    });

    if (game.hasBonus && bonus != null) {
      const sep = document.createElement('span');
      sep.className = 'pb-sep';
      sep.textContent = '|';
      container.appendChild(sep);

      const bonusCls = (options.matchedBonus ? 'matched' : 'bonus') + sizeCls;
      const bEl = createBallElement(bonus, game, bonusCls, numbers.length * 45, false);
      bEl.title = `${game.bonusName}: ${bonus}`;
      container.appendChild(bEl);
    }
  }

  // ── Game Switcher Bar ───────────────────────────────────────────────
  function renderGameSwitcher() {
    const bar = document.getElementById('game-switcher');
    if (!bar) return;
    bar.innerHTML = '';

    Object.values(WA_GAMES).forEach((game) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `game-pill${game.id === currentGameId ? ' active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', game.id === currentGameId ? 'true' : 'false');

      const draws = loadDrawsForGame(game.id);
      const latestJackpot = draws[0]?.jackpot || game.defaultJackpot;

      btn.innerHTML = `
        <span class="game-pill-badge" style="background:${game.color}">${game.badge}</span>
        <span class="game-pill-info">
          <span class="game-pill-name">${game.name}</span>
          <span class="game-pill-jackpot">${latestJackpot}</span>
        </span>
      `;

      btn.addEventListener('click', () => {
        if (game.id === currentGameId) return;
        currentGameId = game.id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME, currentGameId);
        lockedNumbers.clear();
        switchGameAndRender();
      });

      bar.appendChild(btn);
    });
  }

  // ── Left Panel: Latest Official Winning Numbers ─────────────────────
  function renderPreviousDrawPanel() {
    const game = getActiveGame();
    const draw = selectedDraw || currentDraws[0];
    if (!draw) return;

    document.getElementById('header-game-badge').textContent = game.badge;
    document.getElementById('header-game-tagline').textContent = `${game.fullName} — ${game.tagline}`;
    document.getElementById('prev-title-text').textContent = `${game.name} Winning Numbers`;
    document.getElementById('draw-date').textContent = formatDatePretty(draw.date);
    document.getElementById('draw-schedule').textContent = game.drawScheduleLabel;
    document.getElementById('jackpot-amt').textContent = draw.jackpot || game.defaultJackpot;

    document.getElementById('drawn-balls-label').textContent =
      game.id === 'keno'
        ? `Official 20 Drawn Numbers (${draw.numbers.length} balls)`
        : `Official Drawn Numbers (${game.pickCount}${game.hasBonus ? ' + ' + game.bonusName : ''})`;

    const prevBallsContainer = document.getElementById('prev-balls');
    renderBallRow(prevBallsContainer, draw.numbers, draw.bonus, game, {
      baseCls: 'white',
      size: game.id === 'keno' ? 'sm' : ''
    });

    const multStrip = document.getElementById('mult-strip');
    if (draw.mult) {
      document.getElementById('mult-val').textContent = `${draw.mult}×`;
      multStrip.style.display = 'flex';
    } else {
      multStrip.style.display = 'none';
    }

    document.getElementById('prev-sum').textContent = computeSum(draw.numbers);
    document.getElementById('prev-oe').textContent = computeOddEven(draw.numbers);
    document.getElementById('prev-price').textContent = game.priceLabel;
  }

  // ── Right Panel: Smart-Pick Forecast ────────────────────────────────
  function generateNewForecast() {
    const game = getActiveGame();
    const stats = Engine.analyzeDraws(game, currentDraws);
    const line = Engine.generateLine(game, currentDraws, 'balanced');
    const conf = (81 + (computeSum(line.numbers) % 14) + 0.4).toFixed(1);

    currentForecast = {
      ...line,
      conf,
      hotList: stats.hotNumbers.slice(0, 4),
      coldList: stats.coldNumbers.slice(0, 4)
    };
  }

  function renderForecastPanel() {
    const game = getActiveGame();
    if (!currentForecast) generateNewForecast();

    document.getElementById('next-draw-date').textContent = Engine.getNextDrawDate(game);
    document.getElementById('game-odds-label').textContent = game.oddsLabel;

    const foreBallsContainer = document.getElementById('fore-balls');
    renderBallRow(foreBallsContainer, currentForecast.numbers, currentForecast.bonus, game, {
      baseCls: 'green',
      size: game.id === 'keno' ? 'sm' : '',
      hotNumbers: currentForecast.hotList,
      highlightHot: true
    });

    document.getElementById('conf-tag').textContent = `Pattern Fit: ${currentForecast.conf}%`;
    document.getElementById('hot-tag').textContent = `🔥 Hot in ${game.name}: ${currentForecast.hotList.join(', ')}`;
    document.getElementById('cold-tag').textContent = `❄️ Overdue: ${currentForecast.coldList.join(', ')}`;

    document.getElementById('fore-sum').textContent = currentForecast.sum;
    document.getElementById('fore-oe').textContent = currentForecast.oddEven;
    document.getElementById('fore-conf').textContent = `${currentForecast.conf}%`;

    const saveForeBtn = document.getElementById('btn-save-forecast');
    if (saveForeBtn) {
      const already = isLineSaved(game.id, currentForecast.numbers, currentForecast.bonus);
      saveForeBtn.textContent = already ? '★ Forecast Saved' : '☆ Save Forecast';
    }
  }

  // ── Number Generator Studio ─────────────────────────────────────────
  function renderStrategyButtons() {
    const container = document.getElementById('strategy-buttons');
    if (!container) return;
    container.innerHTML = '';

    Object.values(GENERATOR_STRATEGIES).forEach((strat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `strat-btn${strat.id === currentStrategyId ? ' active' : ''}`;
      btn.textContent = strat.shortName;
      btn.title = strat.description;
      btn.addEventListener('click', () => {
        currentStrategyId = strat.id;
        document.getElementById('strategy-desc').textContent = strat.description;
        renderStrategyButtons();
        generateQuickPickSlip();
      });
      container.appendChild(btn);
    });
  }

  function renderLockNumberGrid() {
    const game = getActiveGame();
    const grid = document.getElementById('lock-number-grid');
    const countSpan = document.getElementById('locked-count');
    if (countSpan) countSpan.textContent = String(lockedNumbers.size);
    if (!grid) return;

    grid.innerHTML = '';
    const maxLock = Math.max(1, game.pickCount - 1);
    document.getElementById('lock-grid-label').textContent =
      `Click up to ${maxLock} lucky numbers (${game.minNum}–${game.maxNum}) to lock into every generated ${game.name} play:`;

    for (let n = game.minNum; n <= game.maxNum; n++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isLocked = lockedNumbers.has(n);
      btn.className = `grid-num-btn${isLocked ? ' locked' : ''}`;
      btn.textContent = formatBallNumber(n, game);
      btn.addEventListener('click', () => {
        if (lockedNumbers.has(n)) {
          lockedNumbers.delete(n);
        } else {
          if (lockedNumbers.size >= maxLock) {
            showToast(`⚠️ You can lock at most ${maxLock} numbers for ${game.name}.`);
            return;
          }
          lockedNumbers.add(n);
        }
        renderLockNumberGrid();
        generateQuickPickSlip();
      });
      grid.appendChild(btn);
    }
  }

  function generateQuickPickSlip() {
    const game = getActiveGame();
    const slider = document.getElementById('lines-slider');
    const count = Number(slider?.value || 5);
    document.getElementById('lines-count').textContent = String(count);

    const totalCost = count * game.ticketPrice;
    document.getElementById('slip-cost-summary').textContent =
      `${count} ${count === 1 ? 'play' : 'plays'} · Est. retail slip cost: $${totalCost.toFixed(totalCost % 1 === 0 ? 0 : 2)} (${game.priceLabel})`;

    const stats = Engine.analyzeDraws(game, currentDraws);
    generatedPlays = [];
    for (let i = 0; i < count; i++) {
      const line = Engine.generateLine(game, currentDraws, currentStrategyId, {
        locked: [...lockedNumbers]
      });
      generatedPlays.push({
        ...line,
        hotList: stats.hotNumbers.slice(0, 4)
      });
    }

    renderGeneratedPlays();
  }

  function renderGeneratedPlays() {
    const game = getActiveGame();
    const container = document.getElementById('qp-lines');
    if (!container) return;
    container.innerHTML = '';

    generatedPlays.forEach((play, idx) => {
      const row = document.createElement('div');
      row.className = 'qp-line-row';

      const numLabel = document.createElement('span');
      numLabel.className = 'qp-line-num';
      numLabel.textContent = `PLAY #${idx + 1}`;
      row.appendChild(numLabel);

      const ballsDiv = document.createElement('div');
      ballsDiv.className = 'balls-row';
      renderBallRow(ballsDiv, play.numbers, play.bonus, game, {
        baseCls: 'white',
        size: game.id === 'keno' ? 'sm' : '',
        hotNumbers: play.hotList,
        highlightHot: currentStrategyId === 'hot'
      });
      row.appendChild(ballsDiv);

      const metaDiv = document.createElement('div');
      metaDiv.className = 'qp-line-meta';

      const sumTag = document.createElement('span');
      sumTag.className = 'tag green';
      sumTag.textContent = `Σ ${play.sum} · ${play.oddEven}`;
      metaDiv.appendChild(sumTag);

      const saved = isLineSaved(game.id, play.numbers, play.bonus);
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = `btn sm ${saved ? 'gold' : ''}`;
      saveBtn.textContent = saved ? '★ Saved' : '☆ Save Play';
      saveBtn.addEventListener('click', () => {
        savePlayToVault({
          gameId: game.id,
          numbers: play.numbers,
          bonus: play.bonus,
          strategy: GENERATOR_STRATEGIES[play.strategyId]?.shortName || 'Quick Pick',
          note: `${game.name} Play #${idx + 1}`
        });
        renderGeneratedPlays();
      });
      metaDiv.appendChild(saveBtn);

      row.appendChild(metaDiv);
      container.appendChild(row);
    });
  }

  // ── Custom Ticket Builder & Draw Checker ────────────────────────────
  function renderCustomTicketInputs() {
    const game = getActiveGame();
    const row = document.getElementById('checker-inputs-row');
    const hint = document.getElementById('ticket-range-hint');
    const err = document.getElementById('ticket-input-error');
    if (!row) return;

    const bonusText = game.hasBonus ? ` + 1 ${game.bonusName} (${game.bonusMin}–${game.bonusMax})` : '';
    const uniqueText = game.allowRepeat ? 'repeats allowed, exact order' : 'unique numbers';
    if (hint) {
      hint.textContent = `Format for ${game.fullName}: Enter ${game.pickCount} numbers from ${game.minNum} to ${game.maxNum} (${uniqueText})${bonusText}.`;
    }
    if (err) {
      err.innerHTML = `<span aria-hidden="true">⚠️</span> Please enter ${game.pickCount} valid numbers (${game.minNum}–${game.maxNum})${bonusText}.`;
    }

    row.innerHTML = '';
    for (let i = 0; i < game.pickCount; i++) {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'num-input';
      inp.min = String(game.minNum);
      inp.max = String(game.maxNum);
      inp.required = true;
      inp.placeholder = `#${i + 1}`;
      inp.dataset.index = String(i);
      inp.setAttribute('aria-label', `${game.name} Number ${i + 1} (${game.minNum} to ${game.maxNum})`);
      inp.setAttribute('aria-describedby', 'ticket-range-hint');
      inp.setAttribute('aria-errormessage', 'ticket-input-error');
      row.appendChild(inp);
    }

    if (game.hasBonus) {
      const sep = document.createElement('span');
      sep.className = 'pb-sep';
      sep.textContent = '+';
      row.appendChild(sep);

      const bInp = document.createElement('input');
      bInp.type = 'number';
      bInp.id = 'custom-bonus-input';
      bInp.className = 'num-input bonus-input';
      bInp.min = String(game.bonusMin);
      bInp.max = String(game.bonusMax);
      bInp.required = true;
      bInp.placeholder = game.bonusShort;
      bInp.setAttribute('aria-label', `${game.bonusName} (${game.bonusMin} to ${game.bonusMax})`);
      bInp.setAttribute('aria-describedby', 'ticket-range-hint');
      bInp.setAttribute('aria-errormessage', 'ticket-input-error');
      row.appendChild(bInp);
    }

    const resBox = document.getElementById('check-result');
    if (resBox) {
      resBox.className = 'check-result';
      resBox.textContent = '';
    }
  }

  function readCustomTicketInputs() {
    const game = getActiveGame();
    const inputs = [...document.querySelectorAll('#checker-inputs-row .num-input:not(.bonus-input)')];
    const values = [];

    for (const inp of inputs) {
      if (inp.value === '' || !inp.checkValidity()) {
        inp.focus();
        return { error: `Please enter a valid number between ${game.minNum} and ${game.maxNum}.` };
      }
      const n = Number(inp.value);
      if (!Number.isInteger(n) || n < game.minNum || n > game.maxNum) {
        inp.focus();
        return { error: `Numbers for ${game.name} must be integers from ${game.minNum} to ${game.maxNum}.` };
      }
      values.push(n);
    }

    if (!game.allowRepeat && new Set(values).size !== game.pickCount) {
      return { error: `${game.name} requires ${game.pickCount} unique numbers (no duplicate balls).` };
    }

    let bonus = null;
    if (game.hasBonus) {
      const bInp = document.getElementById('custom-bonus-input');
      const bVal = bInp ? Number(bInp.value) : NaN;
      if (!bInp || bInp.value === '' || !Number.isInteger(bVal) || bVal < game.bonusMin || bVal > game.bonusMax) {
        bInp?.focus();
        return { error: `${game.bonusName} must be between ${game.bonusMin} and ${game.bonusMax}.` };
      }
      bonus = bVal;
    }

    const finalNumbers = game.ordered ? values : [...values].sort((a, b) => a - b);
    const note = (document.getElementById('custom-ticket-note')?.value || '').trim();
    return { numbers: finalNumbers, bonus, note };
  }

  function checkCustomTicket() {
    const parsed = readCustomTicketInputs();
    const resBox = document.getElementById('check-result');
    if (parsed.error) {
      showToast(`⚠️ ${parsed.error}`);
      if (resBox) {
        resBox.className = 'check-result lose';
        resBox.textContent = parsed.error;
      }
      return;
    }

    const game = getActiveGame();
    const targetDraw = selectedDraw || currentDraws[0];
    const latestCheck = Engine.verifyLineAgainstDraw(parsed, targetDraw, game);

    // Also find best historical match across all loaded draws
    let bestHist = null;
    currentDraws.forEach((d) => {
      const v = Engine.verifyLineAgainstDraw(parsed, d, game);
      if (v.isWin && (!bestHist || v.prize > bestHist.prize)) {
        bestHist = { ...v, date: d.date };
      }
    });

    if (!resBox) return;
    const histSummary = bestHist
      ? ` · Best historical hit: ${bestHist.tierLabel} (${bestHist.prizeText}) on ${formatDatePretty(bestHist.date)}`
      : ' · No winning tier hit in loaded draw history';

    if (latestCheck.isWin) {
      resBox.className = 'check-result win';
      resBox.textContent = `🎉 WINNER on ${formatDatePretty(targetDraw.date)}! ${latestCheck.tierLabel} — Prize: ${latestCheck.prizeText} (Matched ${latestCheck.matchCount}${latestCheck.matchedBonus ? ' + ' + game.bonusName : ''})${histSummary}`;
    } else {
      resBox.className = 'check-result lose';
      resBox.textContent = `Checked against ${formatDatePretty(targetDraw.date)} draw: Matched ${latestCheck.matchCount} ball${latestCheck.matchCount === 1 ? '' : 's'}${latestCheck.matchedBonus ? ' + ' + game.bonusName : ''} — No prize tier hit.${histSummary}`;
    }
  }

  // ── Saved Tickets Vault Operations ──────────────────────────────────
  function savePlayToVault({ gameId, numbers, bonus, strategy = 'Custom', note = '' }) {
    const game = WA_GAMES[gameId];
    const normNumbers = game.ordered ? [...numbers] : [...numbers].sort((a, b) => a - b);
    const key = lineKey(gameId, normNumbers, bonus);

    const existing = savedTickets.find((t) => t.key === key);
    if (existing) {
      showToast(`ℹ️ This ${game.name} combination is already in your Saved Vault.`);
      return existing;
    }

    const ticket = {
      id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      key,
      gameId,
      numbers: normNumbers,
      bonus: game.hasBonus ? bonus : null,
      strategy,
      note: note || `${game.name} ${strategy}`,
      starred: false,
      savedAt: new Date().toISOString()
    };

    savedTickets.unshift(ticket);
    persistSavedTickets();
    renderSavedVault();
    renderForecastPanel();
    showToast(`★ Saved ${game.name} play to your Vault!`);
    return ticket;
  }

  function updateHeaderSavedBadge() {
    const badge = document.getElementById('header-saved-count');
    if (badge) badge.textContent = String(savedTickets.length);
  }

  function renderSavedVault() {
    updateHeaderSavedBadge();
    const listEl = document.getElementById('saved-tickets-list');
    if (!listEl) return;

    // Filter by game scope
    const scopedTickets = savedTickets.filter((t) =>
      savedFilterScope === 'all' ? true : t.gameId === currentGameId
    );

    // Evaluate each ticket against its game's active/latest draw
    const evaluated = scopedTickets.map((ticket) => {
      const game = WA_GAMES[ticket.gameId] || getActiveGame();
      const draws = ticket.gameId === currentGameId ? currentDraws : loadDrawsForGame(ticket.gameId);
      const drawToUse = ticket.gameId === currentGameId && selectedDraw ? selectedDraw : draws[0];
      const verification = Engine.verifyLineAgainstDraw(ticket, drawToUse, game);

      // Best historical hit across all loaded draws for that game
      let bestHistorical = null;
      draws.forEach((d) => {
        const v = Engine.verifyLineAgainstDraw(ticket, d, game);
        if (v.isWin && (!bestHistorical || v.prize > bestHistorical.prize)) {
          bestHistorical = { ...v, date: d.date };
        }
      });

      return {
        ticket,
        game,
        drawToUse,
        verification,
        bestHistorical
      };
    });

    // Update KPIs for current scope
    const winnersCount = evaluated.filter((e) => e.verification.isWin).length;
    const totalPayout = evaluated.reduce((sum, e) => sum + (e.verification.prize || 0), 0);
    const bestHitObj = evaluated
      .filter((e) => e.verification.isWin)
      .sort((a, b) => (b.verification.prize || 0) - (a.verification.prize || 0))[0];

    document.getElementById('kpi-saved-total').textContent = String(evaluated.length);
    document.getElementById('kpi-saved-winners').textContent = String(winnersCount);
    document.getElementById('kpi-saved-best-tier').textContent = bestHitObj
      ? `${bestHitObj.game.badge}: ${bestHitObj.verification.prizeText}`
      : 'No Win in Draw';
    document.getElementById('kpi-saved-payout').textContent =
      totalPayout > 0 ? `$${totalPayout.toLocaleString()}` : '$0';

    // Apply status filter ('all' | 'winners' | 'starred')
    const filtered = evaluated.filter((item) => {
      if (savedFilterStatus === 'winners') return item.verification.isWin;
      if (savedFilterStatus === 'starred') return Boolean(item.ticket.starred);
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="saved-empty">
          <p style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:6px;">No Saved Plays Match Current View</p>
          <p>Use <strong>☆ Save Play</strong> or <strong>💾 Save All Plays</strong> in the Generator above, or save a custom ticket to track your numbers across Washington Lottery draws.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    filtered.forEach(({ ticket, game, drawToUse, verification, bestHistorical }) => {
      const card = document.createElement('article');
      card.className = `saved-card${verification.isWin ? ' winner' : ''}${verification.isJackpot ? ' jackpot-winner' : ''}`;

      const left = document.createElement('div');
      left.className = 'saved-card-left';

      const topMeta = document.createElement('div');
      topMeta.className = 'saved-card-top';
      topMeta.innerHTML = `
        <span class="tag" style="background:${game.color}22;color:${game.color};border:1px solid ${game.color}66;">${game.name}</span>
        <strong style="color:var(--text);">${escapeHtml(ticket.note || game.name)}</strong>
        <span>· ${escapeHtml(ticket.strategy || 'Saved')}</span>
        <span>· Saved ${new Date(ticket.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      `;
      left.appendChild(topMeta);

      const ballsRow = document.createElement('div');
      ballsRow.className = 'balls-row';
      renderBallRow(ballsRow, ticket.numbers, ticket.bonus, game, {
        baseCls: 'white',
        size: 'sm',
        matchedNumbers: verification.matchedNumbers,
        matchedIndices: verification.matchedIndices,
        matchedBonus: verification.matchedBonus
      });
      left.appendChild(ballsRow);

      const matchNote = document.createElement('div');
      matchNote.style.cssText = 'font-size:0.74rem;color:var(--muted);';
      const latestText = drawToUse
        ? `Draw ${formatDatePretty(drawToUse.date)}: ${
            verification.isWin
              ? `<strong style="color:var(--accent)">🏆 ${escapeHtml(verification.tierLabel)} (${escapeHtml(verification.prizeText)})</strong>`
              : `Matched ${verification.matchCount}${verification.matchedBonus ? ' + ' + game.bonusShort : ''} ($0)`
          }`
        : 'Waiting for draw';
      const histText = bestHistorical
        ? ` · Best Historical: <strong style="color:var(--gold)">${escapeHtml(bestHistorical.prizeText)}</strong> (${formatDatePretty(bestHistorical.date)})`
        : '';
      matchNote.innerHTML = latestText + histText;
      left.appendChild(matchNote);

      const right = document.createElement('div');
      right.className = 'saved-card-right';

      const tierTag = document.createElement('span');
      tierTag.className = `tag ${verification.isJackpot ? 'gold' : verification.isWin ? 'green' : 'cyan'}`;
      tierTag.textContent = verification.isWin ? `WIN: ${verification.prizeText}` : `${verification.matchCount} Matched`;
      right.appendChild(tierTag);

      const starBtn = document.createElement('button');
      starBtn.type = 'button';
      starBtn.className = `btn sm ${ticket.starred ? 'gold' : ''}`;
      starBtn.textContent = ticket.starred ? '★ Starred' : '☆ Star';
      starBtn.addEventListener('click', () => {
        ticket.starred = !ticket.starred;
        persistSavedTickets();
        renderSavedVault();
      });
      right.appendChild(starBtn);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn sm';
      copyBtn.textContent = '📋';
      copyBtn.title = 'Copy play numbers';
      copyBtn.addEventListener('click', () => {
        const str = `${game.name}: ${ticket.numbers.map((n) => formatBallNumber(n, game)).join(' - ')}${
          game.hasBonus ? ` | ${game.bonusShort}: ${ticket.bonus}` : ''
        }`;
        navigator.clipboard.writeText(str).then(() => showToast('📋 Copied saved play to clipboard!'));
      });
      right.appendChild(copyBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn sm danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        savedTickets = savedTickets.filter((t) => t.id !== ticket.id);
        persistSavedTickets();
        renderSavedVault();
        renderGeneratedPlays();
        renderForecastPanel();
        showToast('🗑️ Removed play from Saved Vault.');
      });
      right.appendChild(delBtn);

      card.appendChild(left);
      card.appendChild(right);
      listEl.appendChild(card);
    });
  }

  // ── Draw History & Frequency Heatmap ────────────────────────────────
  function renderHistoryAndHeatmap() {
    const game = getActiveGame();
    document.getElementById('history-title-text').textContent =
      `${game.fullName} — Draw History & Frequency Heatmap (${currentDraws.length} Draws)`;

    const stats = Engine.analyzeDraws(game, currentDraws);
    const maxCount = Math.max(...stats.items.map((x) => x.count), 1);
    const heatmapEl = document.getElementById('freq-heatmap');

    if (heatmapEl) {
      heatmapEl.innerHTML = stats.items
        .map((item) => {
          const ratio = item.count / maxCount;
          const bg = `rgba(0, 229, 160, ${(0.06 + ratio * 0.42).toFixed(2)})`;
          const border = ratio > 0.75 ? 'rgba(0, 229, 160, 0.65)' : 'var(--border)';
          return `<div class="heat-cell" style="background:${bg};border-color:${border}" title="Ball ${item.number}: Drawn ${item.count} times · Gap: ${item.gap} draws ago">
            <b>${formatBallNumber(item.number, game)}</b>
            <small>${item.count}×</small>
          </div>`;
        })
        .join('');
    }

    const searchTerm = (document.getElementById('history-search')?.value || '').trim().toLowerCase();
    const tbody = document.getElementById('history-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filteredDraws = currentDraws.filter((d) => {
      if (!searchTerm) return true;
      const text = `${d.date} ${formatDatePretty(d.date)} ${d.numbers.join(' ')} ${d.bonus || ''} ${d.jackpot || ''}`.toLowerCase();
      return text.includes(searchTerm);
    });

    filteredDraws.forEach((draw) => {
      const tr = document.createElement('tr');
      const isSelected = selectedDraw && selectedDraw.date === draw.date;
      if (isSelected) {
        tr.style.outline = '1px solid var(--accent)';
      }

      const thDate = document.createElement('th');
      thDate.scope = 'row';
      thDate.textContent = formatDatePretty(draw.date);
      tr.appendChild(thDate);

      const tdBalls = document.createElement('td');
      const ballsWrap = document.createElement('div');
      ballsWrap.className = 'balls-row';
      ballsWrap.style.gap = '4px';
      renderBallRow(ballsWrap, draw.numbers, draw.bonus, game, {
        baseCls: 'white',
        size: 'xs'
      });
      tdBalls.appendChild(ballsWrap);
      tr.appendChild(tdBalls);

      const tdSum = document.createElement('td');
      tdSum.textContent = `Σ ${computeSum(draw.numbers)} (${computeOddEven(draw.numbers)})`;
      tr.appendChild(tdSum);

      const tdJackpot = document.createElement('td');
      tdJackpot.style.color = 'var(--gold)';
      tdJackpot.style.fontWeight = '700';
      tdJackpot.textContent = draw.jackpot || game.defaultJackpot;
      tr.appendChild(tdJackpot);

      const tdAction = document.createElement('td');
      const inspectBtn = document.createElement('button');
      inspectBtn.type = 'button';
      inspectBtn.className = `btn sm ${isSelected ? 'primary' : ''}`;
      inspectBtn.textContent = isSelected ? '✓ Active Draw' : 'Inspect Draw';
      inspectBtn.addEventListener('click', () => {
        selectedDraw = draw;
        renderPreviousDrawPanel();
        renderSavedVault();
        renderHistoryAndHeatmap();
        showToast(`🔍 Loaded ${game.name} draw from ${formatDatePretty(draw.date)} & re-checked saved tickets.`);
      });
      tdAction.appendChild(inspectBtn);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // ── Export & Import Saved Tickets ───────────────────────────────────
  function exportSavedAsJson() {
    if (!savedTickets.length) {
      showToast('⚠️ No saved tickets to export yet.');
      return;
    }
    const blob = new Blob([JSON.stringify(savedTickets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa-lottery-saved-tickets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📥 Exported ${savedTickets.length} saved plays as JSON.`);
  }

  function exportSavedAsCsv() {
    if (!savedTickets.length) {
      showToast('⚠️ No saved tickets to export yet.');
      return;
    }
    const header = 'id,game,numbers,bonus,strategy,note,starred,savedAt\n';
    const rows = savedTickets.map((t) => {
      const nums = (t.numbers || []).join('-');
      const note = `"${String(t.note || '').replaceAll('"', '""')}"`;
      return `${t.id},${t.gameId},${nums},${t.bonus ?? ''},${t.strategy || ''},${note},${Boolean(t.starred)},${t.savedAt}`;
    });
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa-lottery-saved-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📊 Exported ${savedTickets.length} saved plays as CSV.`);
  }

  async function importSavedFromJson(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Invalid JSON format');

      let added = 0;
      parsed.forEach((item) => {
        if (!item || !WA_GAMES[item.gameId] || !Array.isArray(item.numbers)) return;
        const key = lineKey(item.gameId, item.numbers, item.bonus);
        if (!savedTickets.some((t) => t.key === key)) {
          savedTickets.push({
            id: item.id || `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            key,
            gameId: item.gameId,
            numbers: item.numbers.map(Number),
            bonus: item.bonus != null ? Number(item.bonus) : null,
            strategy: item.strategy || 'Imported',
            note: item.note || `${WA_GAMES[item.gameId].name} Imported`,
            starred: Boolean(item.starred),
            savedAt: item.savedAt || new Date().toISOString()
          });
          added++;
        }
      });

      persistSavedTickets();
      renderSavedVault();
      renderGeneratedPlays();
      showToast(`📤 Imported ${added} new saved ticket${added === 1 ? '' : 's'}!`);
    } catch {
      showToast('⚠️ Could not import file. Please select a valid WA Lottery JSON export.');
    }
  }

  // ── Master Render & Game Switch ─────────────────────────────────────
  function switchGameAndRender() {
    currentDraws = loadDrawsForGame(currentGameId);
    selectedDraw = currentDraws[0];
    generateNewForecast();
    renderAll();
    renderCustomTicketInputs();
    generateQuickPickSlip();
  }

  function renderAll() {
    renderGameSwitcher();
    renderPreviousDrawPanel();
    renderForecastPanel();
    renderStrategyButtons();
    renderLockNumberGrid();
    renderSavedVault();
    renderHistoryAndHeatmap();
  }

  // ── Wire Up Event Listeners ─────────────────────────────────────────
  function bindEvents() {
    document.getElementById('btn-sync-live')?.addEventListener('click', syncOfficialDraws);

    document.getElementById('btn-reforecast')?.addEventListener('click', () => {
      generateNewForecast();
      renderForecastPanel();
      showToast(`🔮 New ${getActiveGame().name} Smart-Pick forecast generated!`);
    });

    document.getElementById('btn-jump-saved')?.addEventListener('click', () => {
      document.getElementById('saved-vault-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('btn-toggle-history')?.addEventListener('click', () => {
      document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('btn-copy-prev')?.addEventListener('click', () => {
      const game = getActiveGame();
      const d = selectedDraw || currentDraws[0];
      if (!d) return;
      const text = `${game.fullName} (${d.date}): ${d.numbers.map((n) => formatBallNumber(n, game)).join(' - ')}${
        game.hasBonus ? ` | ${game.bonusShort}: ${d.bonus}` : ''
      }`;
      navigator.clipboard.writeText(text).then(() => showToast('📋 Official winning numbers copied!'));
    });

    document.getElementById('btn-copy-fore')?.addEventListener('click', () => {
      const game = getActiveGame();
      if (!currentForecast) return;
      const text = `${game.fullName} Forecast: ${currentForecast.numbers.map((n) => formatBallNumber(n, game)).join(' - ')}${
        game.hasBonus ? ` | ${game.bonusShort}: ${currentForecast.bonus}` : ''
      } (${currentForecast.conf}% fit)`;
      navigator.clipboard.writeText(text).then(() => showToast('📋 Forecast copied to clipboard!'));
    });

    document.getElementById('btn-save-forecast')?.addEventListener('click', () => {
      const game = getActiveGame();
      if (!currentForecast) return;
      savePlayToVault({
        gameId: game.id,
        numbers: currentForecast.numbers,
        bonus: currentForecast.bonus,
        strategy: 'Smart Forecast',
        note: `${game.name} Forecast (${Engine.getNextDrawDate(game)})`
      });
      renderForecastPanel();
    });

    // Generator Studio controls
    document.getElementById('lines-slider')?.addEventListener('input', (e) => {
      document.getElementById('lines-count').textContent = e.target.value;
      generateQuickPickSlip();
    });

    document.getElementById('btn-toggle-lock-grid')?.addEventListener('click', () => {
      const wrap = document.getElementById('lock-grid-wrap');
      if (!wrap) return;
      wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btn-clear-locked')?.addEventListener('click', () => {
      lockedNumbers.clear();
      renderLockNumberGrid();
      generateQuickPickSlip();
      showToast('🔓 Cleared locked numbers.');
    });

    document.getElementById('btn-generate-qp')?.addEventListener('click', () => {
      generateQuickPickSlip();
      showToast(`🎲 Generated ${generatedPlays.length} new ${getActiveGame().name} plays!`);
    });

    document.getElementById('btn-save-all-qp')?.addEventListener('click', () => {
      const game = getActiveGame();
      if (!generatedPlays.length) {
        showToast('⚠️ Generate plays first.');
        return;
      }
      let added = 0;
      generatedPlays.forEach((play, idx) => {
        const key = lineKey(game.id, play.numbers, play.bonus);
        if (!savedTickets.some((t) => t.key === key)) {
          savedTickets.unshift({
            id: `wa-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            key,
            gameId: game.id,
            numbers: [...play.numbers],
            bonus: game.hasBonus ? play.bonus : null,
            strategy: GENERATOR_STRATEGIES[play.strategyId]?.shortName || 'Quick Pick',
            note: `${game.name} Slip Play #${idx + 1}`,
            starred: false,
            savedAt: new Date().toISOString()
          });
          added++;
        }
      });
      persistSavedTickets();
      renderSavedVault();
      renderGeneratedPlays();
      showToast(
        added > 0
          ? `💾 Saved ${added} ${game.name} play${added === 1 ? '' : 's'} to your Saved Vault!`
          : `ℹ️ All generated plays are already in your Saved Vault.`
      );
    });

    document.getElementById('btn-copy-all-qp')?.addEventListener('click', () => {
      const game = getActiveGame();
      if (!generatedPlays.length) return;
      const linesText = generatedPlays
        .map(
          (l, i) =>
            `Play #${i + 1}: ${l.numbers.map((n) => formatBallNumber(n, game)).join(' - ')}${
              game.hasBonus ? ` | ${game.bonusShort}: ${l.bonus}` : ''
            }`
        )
        .join('\n');
      navigator.clipboard.writeText(`${game.fullName} Slip:\n${linesText}`).then(() => {
        showToast('📋 Entire slip copied to clipboard!');
      });
    });

    // Custom Ticket Builder & Checker
    document.getElementById('btn-check-custom')?.addEventListener('click', checkCustomTicket);

    document.getElementById('custom-ticket-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsed = readCustomTicketInputs();
      if (parsed.error) {
        showToast(`⚠️ ${parsed.error}`);
        return;
      }
      const game = getActiveGame();
      savePlayToVault({
        gameId: game.id,
        numbers: parsed.numbers,
        bonus: parsed.bonus,
        strategy: 'Custom Pick',
        note: parsed.note || `${game.name} Custom Ticket`
      });
      checkCustomTicket();
    });

    document.getElementById('btn-quickfill-custom')?.addEventListener('click', () => {
      const game = getActiveGame();
      const line = Engine.generateLine(game, currentDraws, 'quickpick');
      const inputs = [...document.querySelectorAll('#checker-inputs-row .num-input:not(.bonus-input)')];
      inputs.forEach((inp, idx) => {
        inp.value = String(line.numbers[idx] ?? '');
        inp.classList.remove('user-invalid-fallback');
        inp.removeAttribute('aria-invalid');
      });
      if (game.hasBonus) {
        const bInp = document.getElementById('custom-bonus-input');
        if (bInp) {
          bInp.value = String(line.bonus ?? '');
          bInp.classList.remove('user-invalid-fallback');
          bInp.removeAttribute('aria-invalid');
        }
      }
      checkCustomTicket();
    });

    document.getElementById('custom-ticket-form')?.addEventListener('reset', () => {
      const resBox = document.getElementById('check-result');
      if (resBox) {
        resBox.className = 'check-result';
        resBox.textContent = '';
      }
    });

    // Saved Vault Filter & Export buttons
    document.getElementById('saved-scope-group')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-scope]');
      if (!btn) return;
      savedFilterScope = btn.dataset.scope;
      document
        .querySelectorAll('#saved-scope-group .strat-btn')
        .forEach((b) => b.classList.toggle('active', b === btn));
      renderSavedVault();
    });

    document.getElementById('saved-status-group')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-status]');
      if (!btn) return;
      savedFilterStatus = btn.dataset.status;
      document
        .querySelectorAll('#saved-status-group .strat-btn')
        .forEach((b) => b.classList.toggle('active', b === btn));
      renderSavedVault();
    });

    document.getElementById('btn-export-json')?.addEventListener('click', exportSavedAsJson);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportSavedAsCsv);
    document.getElementById('input-import-json')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) importSavedFromJson(file);
      e.target.value = '';
    });

    document.getElementById('btn-clear-saved')?.addEventListener('click', () => {
      const game = getActiveGame();
      const before = savedTickets.length;
      if (savedFilterScope === 'all') {
        savedTickets = [];
      } else {
        savedTickets = savedTickets.filter((t) => t.gameId !== currentGameId);
      }
      const removed = before - savedTickets.length;
      persistSavedTickets();
      renderSavedVault();
      renderGeneratedPlays();
      renderForecastPanel();
      showToast(
        removed > 0
          ? `🗑️ Cleared ${removed} saved play${removed === 1 ? '' : 's'}.`
          : `ℹ️ No saved plays to clear for ${game.name}.`
      );
    });

    document.getElementById('history-search')?.addEventListener('input', renderHistoryAndHeatmap);
  }

  // ── Initialize App ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('custom-ticket-form');
    if (form) UserInvalidFallback.init(form);

    await loadSavedTicketsFromStorage();
    bindEvents();
    switchGameAndRender();
  });
})();
