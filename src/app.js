(function () {
  const dict = window.WORDS;
  const sources = window.SOURCE_WORDS;

  const state = {
    source: '',
    letters: [],
    used: new Set(),
    input: [],
    validWords: [],
    found: new Set(),
    gamesCompleted: 0,
    revealed: false,
    thresholdCelebrated: false,
  };

  const els = {
    wheel: document.getElementById('wheel'),
    input: document.getElementById('input-row'),
    panel: document.getElementById('words-panel'),
    progress: document.getElementById('progress'),
    progressFill: document.getElementById('progress-fill'),
    progressThreshold: document.getElementById('progress-threshold'),
    toast: document.getElementById('toast'),
    newBtn: document.getElementById('new-btn'),
    clearBtn: document.getElementById('clear-btn'),
    whirlBtn: document.getElementById('whirl-btn'),
    submitBtn: document.getElementById('submit-btn'),
    modal: document.getElementById('modal'),
    modalYes: document.getElementById('modal-yes'),
    modalNo: document.getElementById('modal-no'),
  };

  // Starts at 25%, steps up 5% every 3 completed games, caps at 50%.
  function requiredPct() {
    return Math.min(0.5, 0.25 + Math.floor(state.gamesCompleted / 3) * 0.05);
  }

  function isAnagramOf(candidate, source) {
    const counts = {};
    for (const c of source) counts[c] = (counts[c] || 0) + 1;
    for (const c of candidate) {
      if (!counts[c]) return false;
      counts[c]--;
    }
    return true;
  }

  function findValidWords(source) {
    const valid = [];
    for (const word of dict) {
      if (word.length >= 3 && word.length <= source.length && isAnagramOf(word, source)) {
        valid.push(word);
      }
    }
    valid.sort((a, b) => a.length - b.length || a.localeCompare(b));
    return valid;
  }

  function shuffleArr(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newPuzzle() {
    let src, valid;
    const tried = new Set();
    for (let attempt = 0; attempt < 200; attempt++) {
      src = sources[Math.floor(Math.random() * sources.length)];
      if (tried.has(src)) continue;
      tried.add(src);
      valid = findValidWords(src);
      if (valid.length >= 12 && valid.includes(src)) break;
    }
    if (!valid || valid.length < 12) {
      const sixes = [...dict].filter((w) => w.length === 6);
      for (let attempt = 0; attempt < 500; attempt++) {
        src = sixes[Math.floor(Math.random() * sixes.length)];
        valid = findValidWords(src);
        if (valid.length >= 12) break;
      }
    }
    state.source = src;
    state.letters = shuffleArr(src.split(''));
    state.used = new Set();
    state.input = [];
    state.validWords = valid;
    state.found = new Set();
    state.revealed = false;
    state.thresholdCelebrated = false;
    render();
  }

  function shuffleWheel() {
    const inputLetters = state.input.map((x) => x.letter);
    state.letters = shuffleArr(state.letters);
    const used = new Set();
    const input = [];
    for (const ch of inputLetters) {
      for (let i = 0; i < state.letters.length; i++) {
        if (!used.has(i) && state.letters[i] === ch) {
          used.add(i);
          input.push({ letter: ch, idx: i });
          break;
        }
      }
    }
    state.used = used;
    state.input = input;
    render();
    els.wheel.querySelectorAll('.wheel-letter').forEach((el, i) => {
      el.style.animationDelay = i * 35 + 'ms';
      el.classList.remove('whirling');
      void el.offsetWidth;
      el.classList.add('whirling');
      el.addEventListener(
        'animationend',
        () => {
          el.classList.remove('whirling');
          el.style.animationDelay = '';
        },
        { once: true }
      );
    });
  }

  function clearInput() {
    state.input = [];
    state.used = new Set();
    render();
  }

  function tapWheelLetter(idx) {
    if (state.used.has(idx)) return;
    if (state.input.length >= state.source.length) return;
    state.input.push({ letter: state.letters[idx], idx });
    state.used.add(idx);
    render();
  }

  function tapInputLetter(pos) {
    const item = state.input[pos];
    if (!item) return;
    state.input.splice(pos, 1);
    state.used.delete(item.idx);
    render();
  }

  function submit() {
    const word = state.input.map((x) => x.letter).join('');
    if (word.length < 3) {
      flash('Need 3+ letters', true);
      return;
    }
    if (state.found.has(word)) {
      flash('Already found');
      return;
    }
    if (state.validWords.indexOf(word) >= 0) {
      state.found.add(word);
      const isComplete = state.found.size === state.validWords.length;
      const needed = Math.ceil(state.validWords.length * requiredPct());
      const newlyCelebrate = !state.thresholdCelebrated && state.found.size >= needed;
      if (newlyCelebrate || isComplete) state.thresholdCelebrated = true;
      flash('✓ ' + word.toLowerCase());
      clearInput();
      if (isComplete) {
        setTimeout(() => flash('All found! 🎉'), 700);
        setTimeout(showFireworks, 500);
      } else if (newlyCelebrate) {
        setTimeout(showStars, 300);
      }
    } else {
      flash('Not in word list', true);
      shake();
    }
  }

  function render() {
    const pct = state.validWords.length ? state.found.size / state.validWords.length : 0;
    const req = requiredPct();
    const needed = 1; // Math.ceil(state.validWords.length * req);
    els.progressFill.style.width = pct * 100 + '%';
    els.progressThreshold.style.left = req * 100 + '%';
    els.newBtn.classList.toggle('locked', state.found.size < needed);
    els.newBtn.textContent = state.revealed ? 'Continue' : 'Next puzzle';

    // Wheel letters — radius=110 centres tiles on the ring band (outer=114, inner=106)
    els.wheel.innerHTML = '';
    const n = state.letters.length;
    const radius = 110;
    const cx = 150,
      cy = 150;
    state.letters.forEach((letter, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      const el = document.createElement('div');
      el.className = 'wheel-letter' + (state.used.has(i) ? ' used' : '');
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.textContent = letter;
      el.addEventListener('click', () => tapWheelLetter(i));
      els.wheel.appendChild(el);
    });

    els.input.innerHTML = '';
    if (state.input.length === 0) {
      const ph = document.createElement('span');
      ph.className = 'input-placeholder';
      ph.textContent = 'Tap letters to spell a word';
      els.input.appendChild(ph);
    } else {
      state.input.forEach((item, pos) => {
        const el = document.createElement('div');
        el.className = 'input-letter';
        el.textContent = item.letter;
        el.addEventListener('click', () => tapInputLetter(pos));
        els.input.appendChild(el);
      });
    }

    els.panel.innerHTML = '';
    const slots = document.createElement('div');
    slots.className = 'slots';
    state.validWords.forEach((w) => {
      const slot = document.createElement('div');
      const isFound = state.found.has(w);
      const isRevealed = state.revealed && !isFound;
      slot.className = 'slot' + (isFound ? ' found' : isRevealed ? ' revealed' : '');
      if (isFound || isRevealed) {
        slot.textContent = w;
      } else {
        for (let i = 0; i < w.length; i++) {
          const dot = document.createElement('span');
          dot.className = 'dot';
          slot.appendChild(dot);
        }
      }
      slots.appendChild(slot);
    });
    els.panel.appendChild(slots);

    els.progress.textContent = state.found.size + ' / ' + state.validWords.length;
    saveState();
  }

  const STORAGE_KEY = 'whirlyword_v1';

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          source: state.source,
          letters: state.letters,
          found: [...state.found],
          gamesCompleted: state.gamesCompleted,
          revealed: state.revealed,
          thresholdCelebrated: state.thresholdCelebrated,
        })
      );
    } catch (e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data.source || !Array.isArray(data.letters) || !Array.isArray(data.found)) return false;
      // Ensure the saved letters are a valid permutation of the source
      if (data.letters.slice().sort().join('') !== data.source.split('').sort().join(''))
        return false;
      state.source = data.source;
      state.letters = data.letters;
      state.validWords = findValidWords(data.source);
      // Discard any saved words that are no longer in the word list
      state.found = new Set(data.found.filter((w) => state.validWords.includes(w)));
      state.used = new Set();
      state.input = [];
      state.gamesCompleted = typeof data.gamesCompleted === 'number' ? data.gamesCompleted : 0;
      state.revealed = !!data.revealed;
      state.thresholdCelebrated = !!data.thresholdCelebrated;
      return true;
    } catch (e) {
      return false;
    }
  }

  let toastTimer;
  function flash(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('error', !!isError);
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1100);
  }

  function shake() {
    const row = els.input;
    row.classList.remove('shake');
    void row.offsetWidth;
    row.classList.add('shake');
  }

  function showStars() {
    const container = document.createElement('div');
    container.className = 'star-burst';
    document.body.appendChild(container);
    const chars = ['★', '✦', '✶', '✷', '✵'];
    for (let i = 0; i < 22; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = chars[Math.floor(Math.random() * chars.length)];
      star.style.left = 5 + Math.random() * 90 + 'vw';
      star.style.top = 5 + Math.random() * 75 + 'vh';
      star.style.fontSize = 14 + Math.random() * 30 + 'px';
      star.style.animationDelay = Math.random() * 1000 + 'ms';
      star.style.animationDuration = 500 + Math.random() * 700 + 'ms';
      container.appendChild(star);
    }
    setTimeout(() => container.remove(), 2400);
  }

  function showFireworks() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:150;';
    document.body.appendChild(canvas);
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const ctx = canvas.getContext('2d');
    const COLORS = [
      '#ff6b6b',
      '#ffd93d',
      '#6bcb77',
      '#4d96ff',
      '#ff6bdb',
      '#ff9f43',
      '#a29bfe',
      '#00cec9',
    ];
    const rockets = [],
      particles = [];
    let launched = 0;
    const total = 8;

    function launch() {
      rockets.push({
        x: W * (0.15 + Math.random() * 0.7),
        y: H,
        tx: W * (0.1 + Math.random() * 0.8),
        ty: H * (0.08 + Math.random() * 0.45),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
      launched++;
    }

    function burst(r) {
      const n = 30 + Math.floor(Math.random() * 20);
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.3;
        const spd = 1.5 + Math.random() * 5;
        particles.push({
          x: r.tx,
          y: r.ty,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: r.color,
          life: 1,
          size: 2 + Math.random() * 2.5,
        });
      }
    }

    launch();
    const iv = setInterval(() => {
      if (launched < total) launch();
      else clearInterval(iv);
    }, 450);

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        const dx = r.tx - r.x,
          dy = r.ty - r.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          burst(r);
          rockets.splice(i, 1);
          continue;
        }
        const spd = Math.min(dist, 12);
        r.x += (dx / dist) * spd;
        r.y += (dy / dist) * spd;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - (dx / dist) * 18, r.y - (dy / dist) * 18);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.45;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.vx *= 0.97;
        p.life -= 0.017;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (rockets.length || particles.length || launched < total) requestAnimationFrame(draw);
      else canvas.remove();
    }
    requestAnimationFrame(draw);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (state.input.length > 0) {
        const last = state.input.pop();
        state.used.delete(last.idx);
        render();
      }
    } else if (e.key === 'Escape') {
      clearInput();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      const upper = e.key.toUpperCase();
      for (let i = 0; i < state.letters.length; i++) {
        if (!state.used.has(i) && state.letters[i] === upper) {
          tapWheelLetter(i);
          break;
        }
      }
    }
  });

  els.newBtn.addEventListener('click', () => {
    const needed = Math.ceil(state.validWords.length * requiredPct());
    if (state.found.size < needed) {
      const rem = needed - state.found.size;
      flash('Find ' + rem + ' more word' + (rem === 1 ? '' : 's') + ' to continue', true);
      return;
    }
    if (!state.revealed && state.found.size < state.validWords.length) {
      els.modal.hidden = false;
      return;
    }
    state.gamesCompleted += 1;
    newPuzzle();
  });
  els.modalNo.addEventListener('click', () => {
    els.modal.hidden = true;
  });
  els.modalYes.addEventListener('click', () => {
    els.modal.hidden = true;
    state.revealed = true;
    render();
  });
  els.clearBtn.addEventListener('click', clearInput);
  els.whirlBtn.addEventListener('click', shuffleWheel);
  els.submitBtn.addEventListener('click', submit);

  if (!loadState()) {
    newPuzzle();
  } else {
    render();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
