/* Word Blade 字刃勇者 — 英文打字冒險遊戲 */
(() => {
  'use strict';

  // ---------- 工具 ----------
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('wordblade:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('wordblade:' + k, JSON.stringify(v)); } catch (e) { /* 無痕模式等 */ }
    },
  };

  const settings = Object.assign({ mode: 'adventure', diff: 'normal', meaning: true, sound: true, startStage: 0 }, store.get('settings', {}));
  const saveSettings = () => store.set('settings', settings);

  // ---------- 設定資料 ----------
  const DIFF = {
    easy:   { name: '簡單', spc: 0.62, base: 5.6, gap: 2.7, hp: 6, cap: 3, mul: 0.8 },
    normal: { name: '普通', spc: 0.42, base: 4.3, gap: 2.0, hp: 5, cap: 4, mul: 1.0 },
    hard:   { name: '困難', spc: 0.27, base: 3.2, gap: 1.35, hp: 4, cap: 6, mul: 1.5 },
  };

  const THEMES = [
    { sky: ['#2b3a72', '#f0a56b'], far: '#3c4b7d', mid: '#28474f', ground: '#1f3529', top: '#5c9a4f', deco: 'trees', amb: 'fireflies', sun: '#ffd28a', stars: false,
      mon: { slime: '#7fd65a', bat: '#8d6bd8', ghost: '#cfe3ff', wisp: '#ffcf5a' } },
    { sky: ['#121838', '#40396e'], far: '#28295a', mid: '#20383c', ground: '#18282a', top: '#3f6b55', deco: 'swamp', amb: 'fireflies', sun: '#e6ecff', stars: true,
      mon: { slime: '#5fbf8f', bat: '#6f5fc4', ghost: '#bba8ff', wisp: '#9dff8a' } },
    { sky: ['#0c2036', '#3a7099'], far: '#264d6e', mid: '#355f80', ground: '#24435e', top: '#c4ecff', deco: 'crystals', amb: 'snow', sun: '#e6f6ff', stars: true,
      mon: { slime: '#7fd8ff', bat: '#5b7fd8', ghost: '#e8f8ff', wisp: '#7fe0ff' } },
    { sky: ['#260d18', '#b0452a'], far: '#4d1f25', mid: '#3a171b', ground: '#251212', top: '#ff7a3d', deco: 'lava', amb: 'embers', sun: '#ffb070', stars: false,
      mon: { slime: '#ff8a4a', bat: '#d84a5b', ghost: '#ffc9a8', wisp: '#ffd04a' } },
    { sky: ['#0a091d', '#3d1f55'], far: '#1e1a3c', mid: '#17132e', ground: '#141128', top: '#7a5cc0', deco: 'castle', amb: 'ash', sun: '#f2e6ff', stars: true,
      mon: { slime: '#b07fff', bat: '#e05a8a', ghost: '#d7c8ff', wisp: '#ff6bd6' } },
  ];

  const STAGES = [
    { name: '晨光森林', en: 'DAWNLEAF FOREST', count: 12, tiers: [1, 0, 0], types: ['slime', 'slime', 'bat'],
      boss: { name: '史萊姆王', en: 'SLIME KING', kind: 'slime', hp: 3, ptier: 0 } },
    { name: '月影沼澤', en: 'MOONLIT MIRE', count: 14, tiers: [0.6, 0.4, 0], types: ['slime', 'ghost', 'bat'],
      boss: { name: '沼澤幽后', en: 'BOG WRAITH', kind: 'ghost', hp: 3, ptier: 0 } },
    { name: '冰晶洞窟', en: 'CRYSTAL CAVERN', count: 16, tiers: [0.3, 0.7, 0], types: ['slime', 'bat', 'wisp', 'ghost'],
      boss: { name: '冰霜魔像', en: 'FROST GOLEM', kind: 'golem', hp: 4, ptier: 1 } },
    { name: '熔岩山脈', en: 'MAGMA PEAKS', count: 18, tiers: [0.15, 0.5, 0.35], types: ['slime', 'bat', 'wisp', 'wisp'],
      boss: { name: '熔岩巨像', en: 'MAGMA COLOSSUS', kind: 'golem', hp: 4, ptier: 1 } },
    { name: '暗影城堡', en: 'SHADOW KEEP', count: 20, tiers: [0.1, 0.4, 0.5], types: ['ghost', 'bat', 'wisp', 'slime'],
      boss: { name: '暗影魔王', en: 'SHADOW LORD', kind: 'lord', hp: 5, ptier: 2 } },
  ];

  const LANE_OF = { slime: [0], ghost: [1, 2], bat: [2, 3], wisp: [1, 2, 3] };
  const LANE_H = [0, 0.15, 0.3, 0.45];
  const LABEL_K = { slime: 1.6, ghost: 2.45, bat: 2.25, wisp: 2.05 };
  const SPECIALS = {
    heal:   { icon: '♥', color: '#ff7aa8', label: '+1 生命' },
    freeze: { icon: '❄', color: '#7fe0ff', label: '時間凍結' },
    bomb:   { icon: '✸', color: '#ff6b4a', label: '全體爆破' },
  };

  // ---------- 音效（WebAudio 合成） ----------
  const SFX = {
    ac: null,
    init() {
      if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ac = null; } }
      if (this.ac && this.ac.state === 'suspended') this.ac.resume();
    },
    ok() { return settings.sound && this.ac && !(G && G.demo); },
    tone(f, dur, type = 'square', vol = 0.05, slide = 0, delay = 0) {
      if (!this.ok()) return;
      const t = this.ac.currentTime + delay;
      const o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ac.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol = 0.15, freq = 900, delay = 0) {
      if (!this.ok()) return;
      const t = this.ac.currentTime + delay;
      const len = Math.floor(this.ac.sampleRate * dur);
      const buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ac.createBufferSource(); src.buffer = buf;
      const flt = this.ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = freq;
      const g = this.ac.createGain(); g.gain.value = vol;
      src.connect(flt).connect(g).connect(this.ac.destination); src.start(t);
    },
    key(combo) { this.tone(660 + Math.min(combo, 40) * 12 + rand(-20, 20), 0.045, 'square', 0.025); },
    hit() { this.noise(0.06, 0.08, 2400); },
    kill() { this.tone(523, 0.07, 'square', 0.04); this.tone(784, 0.12, 'square', 0.04, 0, 0.06); this.noise(0.15, 0.08, 1200); },
    miss() { this.tone(140, 0.14, 'sawtooth', 0.05, -60); },
    hurt() { this.noise(0.3, 0.25, 600); this.tone(180, 0.3, 'sawtooth', 0.06, -120); },
    power() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, 0, i * 0.06)); },
    boom() { this.noise(0.6, 0.35, 500); this.tone(90, 0.5, 'sine', 0.2, -50); },
    boss() { this.tone(110, 0.9, 'sawtooth', 0.06, -40); this.tone(82, 1.2, 'sine', 0.12, 0, 0.2); },
    phrase() { this.noise(0.25, 0.2, 900); this.tone(330, 0.2, 'square', 0.05, 200); },
    clear() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.07, 0, i * 0.11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.07, 0, i * 0.18)); },
  };

  // ---------- 畫布 ----------
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, S = 1, DPR = 1, hudBottom = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    S = clamp(Math.min(W / 1000, H / 600), 0.62, 1.35);
    skyCache = null;
    measureHud();
  }
  function measureHud() {
    const el = document.getElementById('hud');
    hudBottom = el && !el.hidden ? el.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top : 0;
  }
  const groundY = () => H * 0.8;
  const heroX = () => Math.max(46 * S + 10, W * 0.1);
  const laneY = (lane) => groundY() - LANE_H[lane] * (H * 0.7);
  const monFont = () => Math.round(clamp(19 * S, 14, 24));

  // ---------- 場景 ----------
  let theme = THEMES[0];
  let skyCache = null;
  const starField = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.6, Math.random() * 1.4 + 0.3, Math.random() * TAU]);
  let amb = [];
  let scroll = 0;
  const hero = { attackT: 0, hurtT: 0, deadT: 0, dead: false, slash: 0 };

  function setTheme(i) { theme = THEMES[i % THEMES.length]; skyCache = null; amb = []; }

  function ridge(x, seed) {
    return Math.sin(x * 0.0042 + seed) * 0.5 + Math.sin(x * 0.0113 + seed * 2.1) * 0.3 + Math.sin(x * 0.027 + seed * 3.7) * 0.2;
  }

  function drawBackground(dt) {
    if (!skyCache) {
      skyCache = ctx.createLinearGradient(0, 0, 0, groundY());
      skyCache.addColorStop(0, theme.sky[0]); skyCache.addColorStop(1, theme.sky[1]);
    }
    ctx.fillStyle = skyCache; ctx.fillRect(0, 0, W, H);
    const t = performance.now() / 1000;
    if (theme.stars) {
      for (const s of starField) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + s[3]);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s[0] * W, s[1] * H, s[2], s[2]);
      }
      ctx.globalAlpha = 1;
    }
    // 太陽／月亮
    const sx = W * 0.74, sy = H * 0.24, sr = 34 * S;
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4);
    glow.addColorStop(0, rgba(theme.sun, 0.35)); glow.addColorStop(1, rgba(theme.sun, 0));
    ctx.fillStyle = glow; ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
    ctx.fillStyle = theme.sun; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
    if (theme.stars) { ctx.fillStyle = theme.sky[0]; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(sx + sr * 0.35, sy - sr * 0.2, sr * 0.85, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }

    const gy = groundY();
    // 遠山
    ctx.fillStyle = theme.far;
    ctx.beginPath(); ctx.moveTo(0, gy);
    for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, gy - H * 0.28 - ridge(x + scroll * 0.15, 1.3) * H * 0.1);
    ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
    if (theme.deco === 'castle') drawCastleFar(gy);
    // 中景
    ctx.fillStyle = theme.mid;
    ctx.beginPath(); ctx.moveTo(0, gy);
    for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, gy - H * 0.12 - ridge(x + scroll * 0.4, 4.2) * H * 0.05);
    ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
    drawDeco(gy);
    // 地面
    ctx.fillStyle = theme.ground; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = theme.top; ctx.fillRect(0, gy, W, Math.max(3, 5 * S));
    ctx.fillStyle = rgba(theme.top, 0.18);
    const step = 60 * S, off = (scroll * 1.0) % step;
    for (let x = -off; x < W; x += step) ctx.fillRect(x, gy + 14 * S, step * 0.45, 3 * S);
    for (let x = -((scroll * 1.0 + step / 2) % step); x < W; x += step) ctx.fillRect(x, gy + 34 * S, step * 0.3, 3 * S);
    if (theme.deco === 'lava') {
      ctx.fillStyle = rgba('#ff7a3d', 0.25 + 0.1 * Math.sin(t * 3));
      for (let x = -((scroll * 1.0) % (step * 3)); x < W; x += step * 3) ctx.fillRect(x, gy + 52 * S, step * 1.2, 4 * S);
    }
    updateAmbient(dt, t);
  }

  function drawCastleFar(gy) {
    ctx.fillStyle = '#120f26';
    const base = gy - H * 0.2, cx = W * 1.3 - ((scroll * 0.15 + W * 0.6) % (W * 1.6));
    for (const [dx, w, h] of [[-90, 40, 0.2], [-50, 60, 0.13], [0, 46, 0.27], [46, 60, 0.12], [90, 36, 0.19]]) {
      const x = cx + dx * S * 1.4, hh = H * h;
      ctx.fillRect(x - w * S / 2, base - hh, w * S, hh + H * 0.2);
      ctx.beginPath(); ctx.moveTo(x - w * S / 2 - 4, base - hh); ctx.lineTo(x, base - hh - 40 * S); ctx.lineTo(x + w * S / 2 + 4, base - hh); ctx.fill();
    }
    ctx.fillStyle = '#ffcf5a';
    for (const dx of [-90, 0, 90]) ctx.fillRect(cx + dx * S * 1.4 - 3 * S, base - H * 0.08, 6 * S, 9 * S);
    ctx.fillStyle = '#120f26';
  }

  function drawDeco(gy) {
    const sp = 150 * S, off = (scroll * 0.6) % sp;
    for (let i = -1, x = -off; x < W + sp; x += sp, i++) {
      const idx = Math.floor((scroll * 0.6) / sp) + i;
      const h = (Math.sin(idx * 12.9898) * 43758.5453) % 1;
      const k = Math.abs(h), xx = x + k * 50 * S;
      switch (theme.deco) {
        case 'trees': {
          ctx.fillStyle = '#1d3a32';
          const th = (60 + k * 50) * S;
          ctx.fillRect(xx - 3 * S, gy - th * 0.3, 6 * S, th * 0.3);
          for (let j = 0; j < 3; j++) {
            const w = (28 - j * 6) * S, y0 = gy - th * 0.25 - j * th * 0.22;
            ctx.beginPath(); ctx.moveTo(xx - w, y0); ctx.lineTo(xx, y0 - th * 0.38); ctx.lineTo(xx + w, y0); ctx.fill();
          }
          break;
        }
        case 'swamp': {
          ctx.strokeStyle = '#162a2a'; ctx.lineWidth = 4 * S; ctx.lineCap = 'round';
          const th = (70 + k * 40) * S;
          ctx.beginPath(); ctx.moveTo(xx, gy); ctx.lineTo(xx + 4 * S, gy - th);
          ctx.moveTo(xx + 2 * S, gy - th * 0.6); ctx.lineTo(xx + 22 * S, gy - th * 0.85);
          ctx.moveTo(xx + 3 * S, gy - th * 0.75); ctx.lineTo(xx - 16 * S, gy - th * 0.95); ctx.stroke();
          ctx.lineWidth = 2 * S;
          for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(xx + 40 * S + j * 6 * S, gy); ctx.lineTo(xx + 38 * S + j * 7 * S, gy - (18 + j * 5) * S); ctx.stroke(); }
          break;
        }
        case 'crystals': {
          for (let j = 0; j < 3; j++) {
            const ch = (30 + k * 40 - j * 10) * S, cw = (9 - j * 2) * S, cx = xx + j * 13 * S;
            ctx.fillStyle = j === 1 ? 'rgba(160,230,255,0.55)' : 'rgba(110,190,235,0.45)';
            ctx.beginPath(); ctx.moveTo(cx - cw, gy); ctx.lineTo(cx - cw * 0.7, gy - ch); ctx.lineTo(cx, gy - ch - cw * 1.4); ctx.lineTo(cx + cw * 0.7, gy - ch); ctx.lineTo(cx + cw, gy); ctx.fill();
          }
          break;
        }
        case 'lava': {
          ctx.fillStyle = '#2e1214';
          const rh = (24 + k * 30) * S;
          ctx.beginPath(); ctx.moveTo(xx - 26 * S, gy); ctx.lineTo(xx - 12 * S, gy - rh); ctx.lineTo(xx + 6 * S, gy - rh * 0.8); ctx.lineTo(xx + 24 * S, gy); ctx.fill();
          ctx.strokeStyle = rgba('#ff7a3d', 0.6); ctx.lineWidth = 2 * S;
          ctx.beginPath(); ctx.moveTo(xx - 10 * S, gy - rh * 0.9); ctx.lineTo(xx - 4 * S, gy - rh * 0.4); ctx.lineTo(xx - 8 * S, gy); ctx.stroke();
          break;
        }
        case 'castle': {
          ctx.fillStyle = '#100d22';
          ctx.fillRect(xx - 3 * S, gy - 46 * S, 6 * S, 46 * S);
          ctx.fillStyle = rgba('#ffcf5a', 0.5 + 0.3 * Math.sin(performance.now() / 180 + idx));
          ctx.beginPath(); ctx.arc(xx, gy - 50 * S, 5 * S, 0, TAU); ctx.fill();
          break;
        }
      }
    }
  }

  function updateAmbient(dt, t) {
    const want = theme.amb === 'snow' ? 70 : theme.amb === 'fireflies' ? 26 : 45;
    while (amb.length < want) {
      amb.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), p: Math.random() * TAU });
    }
    ctx.save();
    if (theme.amb !== 'snow') ctx.globalCompositeOperation = 'lighter';
    for (const a of amb) {
      switch (theme.amb) {
        case 'snow': a.y += (20 + a.s * 40) * S * dt; a.x += Math.sin(t + a.p) * 12 * dt - 30 * S * dt; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(a.x, a.y, 1 + a.s * 2, 0, TAU); ctx.fill(); break;
        case 'fireflies': a.x += Math.sin(t * 0.7 + a.p) * 14 * dt - 8 * dt; a.y += Math.cos(t * 0.9 + a.p) * 10 * dt; ctx.fillStyle = rgba('#e8ff8a', 0.25 + 0.5 * Math.max(0, Math.sin(t * 2 + a.p))); ctx.beginPath(); ctx.arc(a.x, a.y, 1.5 + a.s * 1.5, 0, TAU); ctx.fill(); break;
        case 'embers': a.y -= (25 + a.s * 50) * S * dt; a.x += Math.sin(t * 2 + a.p) * 15 * dt - 20 * dt; ctx.fillStyle = rgba('#ff9a4a', 0.4 + 0.4 * a.s); ctx.fillRect(a.x, a.y, 2 + a.s * 2, 2 + a.s * 2); break;
        default: a.y += (8 + a.s * 12) * dt; a.x -= (15 + a.s * 20) * dt; ctx.fillStyle = rgba('#b48cff', 0.15 + 0.3 * a.s); ctx.fillRect(a.x, a.y, 2, 2);
      }
      if (a.y > H + 10) { a.y = -10; a.x = Math.random() * W; }
      if (a.y < -10) { a.y = H + 10; a.x = Math.random() * W; }
      if (a.x < -10) a.x = W + 10;
      if (a.x > W + 10) a.x = -10;
    }
    ctx.restore();
  }

  // ---------- 角色繪製 ----------
  function ellipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); ctx.fill(); }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function eyes(x, y, r, pupil = '#1a1530', white = '#ffffff') {
    const er = r * 0.19;
    for (const dx of [-er * 1.3, er * 1.3]) {
      ctx.fillStyle = white; ctx.beginPath(); ctx.arc(x + dx, y, er, 0, TAU); ctx.fill();
      ctx.fillStyle = pupil; ctx.beginPath(); ctx.arc(x + dx - er * 0.35, y + er * 0.1, er * 0.55, 0, TAU); ctx.fill();
    }
  }

  function drawSlime(x, y, r, col, t, flash) {
    const sq = 1 + Math.sin(t * 7) * 0.08;
    const w = r * 1.15 * sq, h = r * 0.95 / sq;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(x, y + 2, w * 0.95, r * 0.18);
    ctx.fillStyle = flash ? '#ffffff' : col;
    ctx.beginPath(); ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w, y - h * 1.9, x + w, y - h * 1.9, x + w, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(x - w * 0.42, y - h * 1.0, w * 0.17, h * 0.13);
    eyes(x - w * 0.22, y - h * 0.68, r);
    return y - h * 0.75;
  }
  function drawGhost(x, y, r, col, t, flash) {
    const fy = y + Math.sin(t * 3) * r * 0.25 - r * 0.6;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = flash ? '#ffffff' : col;
    ctx.beginPath(); ctx.arc(x, fy - r * 0.3, r, Math.PI, 0);
    ctx.lineTo(x + r, fy + r * 0.7);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = x + r - (2 * r / n) * i, x1 = x0 - 2 * r / n;
      ctx.quadraticCurveTo((x0 + x1) / 2, fy + r * 0.7 + (i % 2 ? -1 : 1) * r * 0.25 + Math.sin(t * 6 + i) * r * 0.1, x1, fy + r * 0.7);
    }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#231a3d';
    ellipse(x - r * 0.42, fy - r * 0.35, r * 0.15, r * 0.22); ellipse(x + r * 0.05, fy - r * 0.35, r * 0.15, r * 0.22);
    ellipse(x - r * 0.18, fy + r * 0.05, r * 0.12, r * 0.14);
    return fy - r * 0.1;
  }
  function drawBat(x, y, r, col, t, flash) {
    const fy = y + Math.sin(t * 4) * r * 0.3 - r * 0.8;
    const flap = Math.sin(t * 18);
    ctx.fillStyle = flash ? '#ffffff' : col;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x, fy);
      ctx.lineTo(x + s * r * 1.9, fy - r * 0.7 * flap - r * 0.2);
      ctx.lineTo(x + s * r * 1.5, fy + r * 0.35);
      ctx.lineTo(x + s * r * 1.0, fy + r * 0.1);
      ctx.lineTo(x + s * r * 0.6, fy + r * 0.5);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, fy, r * 0.62, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, fy - r * 0.3); ctx.lineTo(x - r * 0.35, fy - r * 0.95); ctx.lineTo(x - r * 0.1, fy - r * 0.5);
    ctx.moveTo(x + r * 0.5, fy - r * 0.3); ctx.lineTo(x + r * 0.35, fy - r * 0.95); ctx.lineTo(x + r * 0.1, fy - r * 0.5); ctx.fill();
    eyes(x - r * 0.08, fy - r * 0.05, r * 0.9, '#c4223a', '#ffe6a8');
    return fy;
  }
  function drawWisp(x, y, r, col, t, flash) {
    const fy = y + Math.sin(t * 2.5) * r * 0.3 - r * 0.7;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, fy, 0, x, fy, r * 2.4);
    g.addColorStop(0, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.4, fy - r * 2.4, r * 4.8, r * 4.8);
    for (let i = 5; i >= 1; i--) {
      ctx.fillStyle = rgba(col, 0.5 - i * 0.07);
      ctx.beginPath(); ctx.arc(x + i * r * 0.42, fy + Math.sin(t * 8 + i) * r * 0.15, r * (0.85 - i * 0.12), 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = flash ? '#ffffff' : col; ctx.beginPath(); ctx.arc(x, fy, r * 0.78, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(x - r * 0.2, fy - r * 0.2, r * 0.35, 0, TAU); ctx.fill();
    eyes(x - r * 0.15, fy, r * 0.85);
    return fy;
  }
  function drawCrown(x, y, w) {
    ctx.fillStyle = '#ffcf4a';
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - w * 0.8); ctx.lineTo(x - w * 0.5, y - w * 0.35); ctx.lineTo(x, y - w * 1.0);
    ctx.lineTo(x + w * 0.5, y - w * 0.35); ctx.lineTo(x + w, y - w * 0.8); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff4a6b'; ctx.beginPath(); ctx.arc(x, y - w * 0.3, w * 0.16, 0, TAU); ctx.fill();
  }
  function drawGolem(x, y, r, col, t, flash, accent) {
    const bob = Math.sin(t * 2) * r * 0.03, sw = Math.sin(t * 2) * r * 0.08;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(x, y + 3, r * 0.9, r * 0.12);
    const c = flash ? '#ffffff' : col;
    ctx.fillStyle = c;
    rr(x - r * 0.55, y - r * 0.55, r * 0.4, r * 0.55, r * 0.06); ctx.fill();
    rr(x + r * 0.15, y - r * 0.55, r * 0.4, r * 0.55, r * 0.06); ctx.fill();
    rr(x - r * 0.75, y - r * 1.6 + bob, r * 1.5, r * 1.1, r * 0.15); ctx.fill();
    rr(x - r * 1.15, y - r * 1.45 + bob + sw, r * 0.38, r * 1.0, r * 0.1); ctx.fill();
    rr(x + r * 0.77, y - r * 1.45 + bob - sw, r * 0.38, r * 1.0, r * 0.1); ctx.fill();
    rr(x - r * 0.4, y - r * 2.15 + bob, r * 0.8, r * 0.6, r * 0.12); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(x - r * 0.75, y - r * 1.0 + bob, r * 1.5, r * 0.5, r * 0.1); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = accent;
    rr(x - r * 0.3, y - r * 1.95 + bob, r * 0.18, r * 0.1, 2); ctx.fill();
    rr(x + r * 0.02, y - r * 1.95 + bob, r * 0.18, r * 0.1, 2); ctx.fill();
    ctx.strokeStyle = rgba(accent, 0.75); ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 1.5 + bob); ctx.lineTo(x - r * 0.05, y - r * 1.25 + bob); ctx.lineTo(x - r * 0.2, y - r * 1.05 + bob);
    ctx.moveTo(x + r * 0.35, y - r * 1.45 + bob); ctx.lineTo(x + r * 0.2, y - r * 1.2 + bob); ctx.stroke();
    ctx.restore();
    return y - r * 1.2;
  }
  function drawLord(x, y, r, col, t, flash, accent) {
    const fy = y - r * 0.15 + Math.sin(t * 1.8) * r * 0.08;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, fy - r * 1.2, 0, x, fy - r * 1.2, r * 2.2);
    g.addColorStop(0, rgba(accent, 0.28)); g.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, fy - r * 3.4, r * 4.4, r * 4.4);
    ctx.restore();
    ctx.fillStyle = flash ? '#ffffff' : '#1c1435';
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, fy - r * 1.8);
    ctx.quadraticCurveTo(x - r * 1.2, fy - r * 0.8, x - r * 1.1, fy);
    for (let i = 0; i < 5; i++) {
      const x0 = x - r * 1.1 + i * r * 0.44;
      ctx.quadraticCurveTo(x0 + r * 0.22, fy - r * 0.18 + Math.sin(t * 5 + i) * r * 0.08, x0 + r * 0.44, fy);
    }
    ctx.quadraticCurveTo(x + r * 1.2, fy - r * 0.8, x + r * 0.35, fy - r * 1.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : col; rr(x - r * 0.12, fy - r * 1.55, r * 0.24, r * 1.2, r * 0.05); ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : '#2a1f4d'; ctx.beginPath(); ctx.arc(x, fy - r * 1.95, r * 0.46, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#d9cfff'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.3, fy - r * 2.25); ctx.quadraticCurveTo(x + s * r * 0.75, fy - r * 2.5, x + s * r * 0.6, fy - r * 2.95); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = accent;
    ellipse(x - r * 0.2, fy - r * 1.95, r * 0.1, r * 0.06); ellipse(x + r * 0.12, fy - r * 1.95, r * 0.1, r * 0.06);
    ctx.restore();
    return fy - r * 1.3;
  }

  function drawHero(t) {
    const x = heroX(), y = groundY(), s = S;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(x, y + 2, 22 * s, 5 * s);
    if (hero.dead) {
      const k = clamp(hero.deadT / 0.5, 0, 1);
      ctx.translate(x, y); ctx.rotate(-k * Math.PI / 2 * 0.95); ctx.translate(-x, -y);
    }
    const walking = G && !hero.dead && (G.phase === 'play' || G.phase === 'boss' || G.demo);
    const bob = walking ? Math.sin(t * 10) * 1.5 * s : Math.sin(t * 2) * 1 * s;
    const step = walking ? Math.sin(t * 10) * 4 * s : 0;
    const flash = hero.hurtT > 0 && Math.floor(hero.hurtT * 20) % 2 === 0;
    // 披風
    ctx.fillStyle = '#c4423a';
    ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 44 * s + bob);
    ctx.quadraticCurveTo(x - 24 * s, y - 34 * s + Math.sin(t * 6) * 3 * s, x - 28 * s + Math.sin(t * 8) * 3 * s, y - 12 * s);
    ctx.lineTo(x - 8 * s, y - 16 * s); ctx.closePath(); ctx.fill();
    // 腿
    ctx.fillStyle = '#3a3f66';
    rr(x - 9 * s + step, y - 19 * s, 7 * s, 19 * s, 2 * s); ctx.fill();
    rr(x + 2 * s - step, y - 19 * s, 7 * s, 19 * s, 2 * s); ctx.fill();
    // 身體
    ctx.fillStyle = flash ? '#ffffff' : '#cfd6f2';
    rr(x - 12 * s, y - 46 * s + bob, 24 * s, 30 * s, 6 * s); ctx.fill();
    ctx.fillStyle = '#ffb547'; ctx.fillRect(x - 12 * s, y - 24 * s + bob, 24 * s, 4 * s);
    ctx.fillStyle = '#2f3a7a'; rr(x - 5 * s, y - 42 * s + bob, 10 * s, 17 * s, 2 * s); ctx.fill();
    // 盾
    ctx.fillStyle = '#8a95c8'; ctx.beginPath(); ctx.arc(x - 12 * s, y - 32 * s + bob, 9 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb547'; ctx.beginPath(); ctx.arc(x - 12 * s, y - 32 * s + bob, 3.5 * s, 0, TAU); ctx.fill();
    // 頭盔
    ctx.fillStyle = flash ? '#ffffff' : '#e8ecff'; ctx.beginPath(); ctx.arc(x, y - 56 * s + bob, 12 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b2148'; rr(x + 1 * s, y - 59 * s + bob, 11 * s, 4 * s, 2 * s); ctx.fill();
    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 67 * s + bob);
    ctx.quadraticCurveTo(x - 14 * s, y - 80 * s + bob, x - 22 * s + Math.sin(t * 7) * 2 * s, y - 66 * s + bob);
    ctx.quadraticCurveTo(x - 10 * s, y - 70 * s + bob, x - 4 * s, y - 63 * s + bob); ctx.fill();
    // 劍
    const ang = -1.15 + Math.sin(clamp(hero.attackT, 0, 1) * Math.PI) * 1.75;
    const px = x + 8 * s, py = y - 36 * s + bob;
    ctx.translate(px, py); ctx.rotate(ang);
    ctx.fillStyle = '#5a3a1e'; rr(-6 * s, -2 * s, 9 * s, 4 * s, 1 * s); ctx.fill();
    ctx.fillStyle = '#ffb547'; ctx.fillRect(2 * s, -6 * s, 3 * s, 12 * s);
    const bladeGlow = 0.5 + Math.min(1, (G ? G.combo : 0) / 30) * 0.5;
    ctx.fillStyle = `rgba(255,214,140,${0.25 * bladeGlow})`; rr(4 * s, -5 * s, 40 * s, 10 * s, 5 * s); ctx.fill();
    ctx.fillStyle = '#f2f5ff';
    ctx.beginPath(); ctx.moveTo(5 * s, -2.5 * s); ctx.lineTo(38 * s, -2.5 * s); ctx.lineTo(44 * s, 0); ctx.lineTo(38 * s, 2.5 * s); ctx.lineTo(5 * s, 2.5 * s); ctx.fill();
    ctx.restore();
    // 揮砍軌跡
    if (hero.slash > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,190,90,${hero.slash})`; ctx.lineWidth = 5 * s * hero.slash; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(px, py, 46 * s, -1.2, 0.7); ctx.stroke();
      ctx.restore();
    }
  }
  const swordTip = () => {
    const s = S, x = heroX(), y = groundY();
    return { x: x + 8 * s + 40 * s * Math.cos(0.3), y: y - 36 * s + 40 * s * Math.sin(0.3) - 12 * s };
  };

  // ---------- 遊戲狀態 ----------
  let G = null;
  let lastWords = [];
  let monsterId = 0;

  function stageCfg() {
    if (G.mode === 'adventure') {
      const st = STAGES[G.stage];
      return { theme: G.stage, name: st.name, en: st.en, count: st.count, tiers: st.tiers, types: st.types, boss: st.boss, pace: 1 + G.stage * 0.08, label: `第 ${G.stage + 1} 關` };
    }
    if (G.demo) return { theme: 0, name: '', en: '', count: 9999, tiers: [1, 0.3, 0], types: ['slime', 'bat', 'ghost', 'wisp'], boss: null, pace: 0.9 };
    const n = G.wave, ti = Math.floor((n - 1) / 5) % STAGES.length, st = STAGES[ti], tt = Math.min(1, (n - 1) / 15);
    return {
      theme: ti, name: st.name, en: st.en, count: 7 + Math.min(n, 13),
      tiers: [Math.max(0.1, 1 - tt), 0.3 + 0.4 * tt, tt * 0.8], types: st.types,
      boss: n % 5 === 0 ? Object.assign({}, st.boss, { hp: st.boss.hp + Math.floor(n / 10), ptier: Math.min(2, Math.floor(n / 10)) }) : null,
      pace: 1 + Math.min(1.3, (n - 1) * 0.055), label: `第 ${n} 波`,
    };
  }

  function newGame(mode, diff, demo = false, stage = 0) {
    const d = DIFF[diff];
    G = {
      mode, diff, d, demo, stage, wave: 1,
      hp: d.hp, maxHp: d.hp, score: 0, combo: 0, maxCombo: 0,
      correct: 0, wrong: 0, words: 0, activeTime: 0, miss: {}, hurtThisStage: false,
      monsters: [], projectiles: [], particles: [], floaters: [],
      target: null, spawnT: 0.8, toSpawn: 0, phase: 'intro', phaseT: 0, boss: null,
      freezeT: 0, shake: 0, paused: false, cfg: null, demoT: 0,
    };
    hero.dead = false; hero.deadT = 0; hero.hurtT = 0;
    beginSection();
  }

  function beginSection() {
    G.cfg = stageCfg();
    setTheme(G.cfg.theme);
    G.toSpawn = G.cfg.count;
    G.spawned = 0;
    G.monsters = G.monsters.filter((m) => !m.dead && m.doomed);
    G.target = null; G.boss = null;
    if (G.demo) { G.phase = 'play'; return; }
    G.phase = 'intro'; G.phaseT = 0;
    if (G.mode === 'adventure') showBanner(G.cfg.label, G.cfg.name, G.cfg.en);
    else showBanner(G.cfg.label, G.cfg.boss ? '魔王來襲' : G.cfg.name, G.cfg.en);
    if (G.mode === 'adventure') G.stageStart = { score: G.score, correct: G.correct, wrong: G.wrong, words: G.words, time: G.activeTime, maxCombo: 0 };
    G.hurtThisStage = false;
    renderHud(true);
  }

  function chooseWord(weights) {
    const live = G.monsters.filter((m) => !m.dead && !m.doomed);
    const usedFirst = new Set(live.map((m) => m.word[m.typed] || m.word[0]));
    const tot = weights[0] + weights[1] + weights[2];
    let best = null;
    for (let i = 0; i < 50; i++) {
      let r = Math.random() * tot, tier = 0;
      while (tier < 2 && r > weights[tier]) { r -= weights[tier]; tier++; }
      const e = pick(WORDS.tiers[tier]);
      if (!best) best = e;
      if (usedFirst.has(e.w[0]) || lastWords.includes(e.w)) continue;
      best = e; break;
    }
    lastWords.push(best.w); if (lastWords.length > 30) lastWords.shift();
    return best;
  }

  function spawnMonster() {
    const cfg = G.cfg;
    const types = cfg.types.slice().sort(() => Math.random() - 0.5);
    let type = null, lane = -1;
    for (const ty of types) {
      const lanes = LANE_OF[ty].slice().sort(() => Math.random() - 0.5);
      for (const l of lanes) {
        if (!G.monsters.some((m) => !m.dead && !m.isBoss && m.lane === l && m.p < 0.28)) { type = ty; lane = l; break; }
      }
      if (type) break;
    }
    if (!type) return false;
    const e = chooseWord(cfg.tiers);
    let special = null;
    if (!G.demo && Math.random() < 0.085) {
      const opts = ['freeze', 'bomb']; if (G.hp < G.maxHp) opts.push('heal', 'heal');
      special = pick(opts);
    }
    const len = e.w.length;
    const T = (G.d.base + len * G.d.spc * 1.7) / cfg.pace;
    G.monsters.push({
      id: ++monsterId, type, lane, word: e.w, meaning: e.m, typed: 0,
      p: 0, v: 1 / T, t: rand(0, 10), flash: 0, shakeT: 0, doomed: false, doomT: 0, dead: false,
      special, r: 20, isBoss: false, cx: 0, cy: 0,
    });
    G.spawned++;
    return true;
  }

  function spawnBoss() {
    const b = G.cfg.boss;
    const pool = WORDS.phrases[b.ptier].slice().sort(() => Math.random() - 0.5);
    const phrases = pool.slice(0, b.hp);
    while (phrases.length < b.hp) phrases.push(pick(WORDS.phrases[b.ptier]));
    const total = phrases.reduce((a, p) => a + p.w.length, 0);
    const T = (total * G.d.spc * 1.25 + b.hp * 2.5 + 6) / Math.sqrt(G.cfg.pace);
    const boss = {
      id: ++monsterId, type: b.kind, lane: 0, word: phrases[0].w, meaning: phrases[0].m, typed: 0,
      phrases, pi: 0, hp: b.hp, maxHp: b.hp,
      p: -0.35, v: 1 / T, t: 0, flash: 0, shakeT: 0, doomed: false, doomT: 0, dead: false,
      special: null, r: 58, isBoss: true, cx: 0, cy: 0, name: b.name,
    };
    G.boss = boss; G.monsters.push(boss);
    showBossBar();
  }

  const monsterX = (m) => {
    const start = m.isBoss ? W - 130 * S : W + 34 * S, end = heroX() + (m.isBoss ? 80 : 42) * S;
    return lerp(start, end, m.p);
  };

  // ---------- 輸入 ----------
  function inPlay() { return G && !G.demo && !G.paused && (G.phase === 'play' || G.phase === 'boss' || G.phase === 'bossIntro'); }

  function handleChar(chRaw) {
    if (!G) return;
    const ch = chRaw.toLowerCase();
    if (!/^[a-z ]$/.test(ch)) return;
    if (G.target && (G.target.dead || G.target.doomed)) G.target = null;
    let m = G.target;
    if (!m) {
      if (ch === ' ') return;
      let best = null;
      for (const o of G.monsters) {
        if (o.dead || o.doomed || o.p < -0.02) continue;
        if (o.word[o.typed] === ch && (!best || o.p > best.p)) best = o;
      }
      if (!best) { miss(null); return; }
      m = G.target = best;
    }
    if (m.word[m.typed] === ch) {
      m.typed++;
      if (!G.demo) { G.correct++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); }
      const mult = comboMult();
      if (!G.demo) G.score += Math.round(10 * mult * G.d.mul);
      SFX.key(G.combo);
      const done = m.typed >= m.word.length;
      fire(m, done);
      if (done) completeWord(m);
      if (!G.demo && [10, 25, 50, 100, 150, 200].includes(G.combo)) {
        floater(heroX() + 20 * S, groundY() - 110 * S, `${G.combo} COMBO!`, '#ffb547', 26);
        SFX.power();
      }
      bumpCombo();
    } else {
      miss(m.word[m.typed], m);
    }
  }

  function comboMult() { return 1 + Math.min(3, Math.floor(G.combo / 10) * 0.5); }

  function miss(expected, m) {
    if (G.demo) return;
    G.wrong++;
    if (expected && expected !== ' ') G.miss[expected] = (G.miss[expected] || 0) + 1;
    if (expected === ' ') G.miss['空白'] = (G.miss['空白'] || 0) + 1;
    const hadCombo = G.combo >= 5;
    G.combo = 0;
    SFX.miss();
    if (m) { m.shakeT = 0.3; floater(monsterX(m), m.cy - 50 * S, 'MISS', '#ff6b4a', 16); }
    else floater(heroX() + 30 * S, groundY() - 90 * S, 'MISS', '#ff6b4a', 15);
    if (hadCombo) floater(heroX() + 20 * S, groundY() - 120 * S, '連擊中斷', '#9aa3cc', 14);
    renderHud();
  }

  function releaseTarget() {
    if (G && G.target) { G.target.typed = 0; G.target = null; }
  }

  function fire(m, final) {
    hero.attackT = 1; hero.slash = 0.9;
    const tip = swordTip();
    G.projectiles.push({ m, sx: tip.x, sy: tip.y, x: tip.x, y: tip.y, t: 0, dur: m.isBoss ? 0.16 : 0.11, final, trail: [] });
  }

  function completeWord(m) {
    G.target = null;
    const mult = comboMult();
    if (m.isBoss) {
      m.hp--; m.pi++;
      if (!G.demo) G.score += Math.round(400 * mult * G.d.mul);
      SFX.phrase();
      G.shake = 0.35;
      m.p = Math.max(0, m.p - 0.12);
      burst(monsterX(m), m.cy, '#ffb547', 26, 260);
      floater(monsterX(m), m.cy - 70 * S, `-1 ${m.name}`, '#ffb547', 22);
      if (m.hp <= 0) {
        m.doomed = true; G.words++;
        for (const o of G.monsters) if (o !== m && !o.dead && !o.doomed) { o.doomed = true; o.doomT = 0.2; }
      }
      else { m.word = m.phrases[m.pi].w; m.meaning = m.phrases[m.pi].m; m.typed = 0; }
      showBossBar();
      return;
    }
    m.doomed = true;
    if (!G.demo) {
      G.words++;
      G.score += Math.round(m.word.length * 20 * mult * G.d.mul);
    }
    if (m.special) triggerSpecial(m);
  }

  function triggerSpecial(m) {
    const sp = SPECIALS[m.special];
    floater(monsterX(m), m.cy - 60 * S, sp.label, sp.color, 22);
    SFX.power();
    if (m.special === 'heal') {
      G.hp = Math.min(G.maxHp, G.hp + 1);
      burst(heroX(), groundY() - 40 * S, sp.color, 24, 160);
    } else if (m.special === 'freeze') {
      G.freezeT = 4;
    } else if (m.special === 'bomb') {
      SFX.boom(); G.shake = 0.6;
      for (const o of G.monsters) {
        if (o === m || o.dead || o.doomed || o.isBoss) continue;
        o.doomed = true; o.doomT = 0.25;
        G.words++; G.score += Math.round(o.word.length * 15 * G.d.mul);
        burst(monsterX(o), o.cy, '#ff6b4a', 30, 320);
      }
      if (G.boss && !G.boss.doomed) G.boss.p = Math.max(0, G.boss.p - 0.1);
    }
    renderHud();
  }

  function killMonster(m) {
    m.dead = true;
    const col = theme.mon[m.type] || '#ffffff';
    if (m.isBoss) {
      for (let i = 0; i < 5; i++) setTimeout(() => { if (G) { burst(monsterX(m) + rand(-60, 60) * S, m.cy + rand(-60, 60) * S, pick(['#ffb547', '#ff6b4a', col]), 40, 380); SFX.boom(); } }, i * 140);
      G.shake = 0.8;
    } else {
      burst(monsterX(m), m.cy, col, 22, 230);
      burst(monsterX(m), m.cy, '#ffe0a0', 8, 120);
      SFX.kill();
      if (!G.demo) floater(monsterX(m), m.cy - 30 * S, '+' + Math.round(m.word.length * 20 * comboMult() * G.d.mul), '#ffe0a0', 16);
    }
  }

  function reachHero(m) {
    if (G.demo) { m.dead = true; burst(monsterX(m), m.cy, theme.mon[m.type], 14, 150); return; }
    if (G.target === m) G.target = null;
    const dmg = m.isBoss ? 2 : 1;
    G.hp -= dmg; G.combo = 0; G.hurtThisStage = true;
    hero.hurtT = 0.6; G.shake = 0.5;
    SFX.hurt();
    burst(heroX() + 10 * S, groundY() - 40 * S, '#ff4a5a', 26, 260);
    floater(heroX(), groundY() - 100 * S, `-${dmg} ♥`, '#ff4a5a', 22);
    const h = $('#hp'); h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit');
    if (m.isBoss) { m.p = 0.4; m.typed = 0; }
    else { m.dead = true; burst(monsterX(m), m.cy, theme.mon[m.type], 18, 200); }
    if (G.hp <= 0) { G.hp = 0; gameOver(); }
    renderHud();
  }

  // ---------- 特效 ----------
  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = rand(0.3, 1) * speed * S;
      G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * S, life: rand(0.4, 0.9), t: 0, color, size: rand(2, 5) * S });
    }
  }
  function floater(x, y, text, color, size) {
    G.floaters.push({ x, y, text, color, size, t: 0, life: 1.0 });
  }

  // ---------- 主迴圈 ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    if (G && G.paused) dt = 0;
    update(dt);
    render(dt);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    if (!G) return;
    const t = performance.now() / 1000;
    hero.attackT = Math.max(0, hero.attackT - dt / 0.14);
    hero.slash = Math.max(0, hero.slash - dt * 5);
    hero.hurtT = Math.max(0, hero.hurtT - dt);
    if (hero.dead) hero.deadT += dt;
    G.shake = Math.max(0, G.shake - dt * 1.6);
    G.freezeT = Math.max(0, G.freezeT - dt);
    const moving = G.phase === 'play' || G.phase === 'boss' || G.demo;
    if (moving && !hero.dead) scroll += 60 * S * dt;
    G.phaseT += dt;

    if (G.phase === 'play' || G.phase === 'boss') G.activeTime += dt;

    switch (G.phase) {
      case 'intro':
        if (G.phaseT > 2.0) {
          if (G.cfg.boss && G.mode === 'endless') { startBossIntro(); }
          else { G.phase = 'play'; G.phaseT = 0; }
        }
        break;
      case 'play': {
        G.spawnT -= dt;
        const live = G.monsters.filter((m) => !m.dead && !m.doomed).length;
        if (G.toSpawn > 0 && G.spawnT <= 0 && live < G.d.cap + (G.cfg.pace > 1.3 ? 1 : 0)) {
          if (spawnMonster()) { G.toSpawn--; G.spawnT = G.d.gap * rand(0.75, 1.25) / G.cfg.pace; }
          else G.spawnT = 0.3;
        }
        if (G.demo && G.toSpawn < 100) G.toSpawn = 9999;
        if (G.toSpawn === 0 && G.monsters.every((m) => m.dead)) {
          if (G.cfg.boss) startBossIntro();
          else nextSection();
        }
        break;
      }
      case 'bossIntro':
        if (G.boss && G.boss.p < 0) G.boss.p = Math.min(0, G.boss.p + dt * 0.16);
        if (G.phaseT > 2.6) { G.phase = 'boss'; G.phaseT = 0; G.spawnT = 3; }
        break;
      case 'boss': {
        G.spawnT -= dt;
        const live = G.monsters.filter((m) => !m.dead && !m.doomed && !m.isBoss).length;
        if (G.boss && !G.boss.doomed && G.spawnT <= 0 && live < Math.max(1, G.d.cap - 2)) {
          if (spawnMonster()) G.spawnT = G.d.gap * 2.4 * rand(0.8, 1.2) / G.cfg.pace; else G.spawnT = 0.5;
        }
        if (G.boss && G.boss.dead && G.monsters.every((m) => m.dead || m.doomed)) {
          for (const m of G.monsters) if (!m.dead) { m.doomed = true; }
          G.phase = 'cleared'; G.phaseT = 0; hideBossBar(); SFX.clear();
        }
        break;
      }
      case 'cleared':
        if (G.phaseT > 1.8) stageCleared();
        break;
      case 'over':
        break;
    }

    // 怪物
    for (const m of G.monsters) {
      if (m.dead) continue;
      m.t += dt;
      m.flash = Math.max(0, m.flash - dt);
      m.shakeT = Math.max(0, m.shakeT - dt);
      if (m.doomed) {
        m.doomT += dt;
        if (m.doomT > (m.isBoss ? 0.6 : 0.45)) killMonster(m);
        continue;
      }
      const canMove = G.freezeT <= 0 && G.phase !== 'over' && G.phase !== 'cleared' && !(m.isBoss && G.phase === 'bossIntro');
      if (canMove) m.p += m.v * dt;
      if (m.p >= 1) reachHero(m);
    }
    G.monsters = G.monsters.filter((m) => !m.dead || m === G.boss);

    // 投射物
    for (const pr of G.projectiles) {
      pr.t += dt;
      const k = Math.min(1, pr.t / pr.dur), e = k * k;
      const tx = monsterX(pr.m), ty = pr.m.cy || groundY() - 30 * S;
      pr.trail.push([pr.x, pr.y]); if (pr.trail.length > 6) pr.trail.shift();
      pr.x = lerp(pr.sx, tx, e); pr.y = lerp(pr.sy, ty, e) - Math.sin(k * Math.PI) * 30 * S;
      if (k >= 1) {
        pr.done = true;
        pr.m.flash = 0.08;
        if (!pr.m.isBoss && !pr.m.doomed) pr.m.p = Math.max(0, pr.m.p - 0.006);
        for (let i = 0; i < 6; i++) G.particles.push({ x: tx, y: ty, vx: rand(40, 220) * S, vy: rand(-160, 160) * S, life: rand(0.15, 0.35), t: 0, color: '#ffd28a', size: rand(1.5, 3) * S });
        SFX.hit();
        if (pr.final && pr.m.doomed && !pr.m.dead) killMonster(pr.m);
      }
    }
    G.projectiles = G.projectiles.filter((p) => !p.done);

    for (const p of G.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * S * dt; p.vx *= 0.98; }
    G.particles = G.particles.filter((p) => p.t < p.life);
    for (const f of G.floaters) { f.t += dt; f.y -= 40 * S * dt; }
    G.floaters = G.floaters.filter((f) => f.t < f.life);

    if (G.demo) demoAI(dt);
    if (!G.demo) renderHud();
    void t;
  }

  function demoAI(dt) {
    G.demoT -= dt;
    if (G.demoT > 0) return;
    G.demoT = rand(0.09, 0.2);
    let m = G.target;
    if (!m || m.dead || m.doomed) {
      m = null;
      for (const o of G.monsters) if (!o.dead && !o.doomed && o.p > 0.3 && (!m || o.p > m.p)) m = o;
      if (!m) return;
    }
    handleChar(m.word[m.typed]);
  }

  function startBossIntro() {
    G.phase = 'bossIntro'; G.phaseT = 0;
    spawnBoss();
    showBanner('WARNING', G.cfg.boss.name, G.cfg.boss.en, true);
    SFX.boss();
  }

  function nextSection() {
    if (G.mode === 'endless') { G.wave++; beginSection(); }
  }

  // ---------- 繪製 ----------
  function render(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    if (G && G.shake > 0) {
      const a = G.shake * 10 * S;
      ctx.translate(rand(-a, a), rand(-a, a));
    }
    drawBackground(dt);
    const t = performance.now() / 1000;
    if (G) {
      const list = G.monsters.filter((m) => !m.dead).sort((a, b) => b.lane - a.lane);
      for (const m of list) drawMonster(m);
      drawHero(t);
      // 投射物
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const pr of G.projectiles) {
        ctx.strokeStyle = 'rgba(255,181,71,0.5)'; ctx.lineWidth = 4 * S; ctx.lineCap = 'round';
        ctx.beginPath();
        pr.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.lineTo(pr.x, pr.y); ctx.stroke();
        ctx.strokeStyle = '#fff2d0'; ctx.lineWidth = 3 * S;
        ctx.beginPath(); ctx.arc(pr.x - 6 * S, pr.y, 10 * S, -1.1, 1.1); ctx.stroke();
      }
      for (const p of G.particles) {
        ctx.globalAlpha = 1 - p.t / p.life;
        ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      // 字卡（放最上層，鎖定目標最後畫）
      const labeled = list.filter((m) => !m.doomed && m !== G.target);
      for (const m of labeled) drawLabel(m, false);
      if (G.target && !G.target.dead && !G.target.doomed) drawLabel(G.target, true);
      // 浮動文字
      for (const f of G.floaters) {
        const k = f.t / f.life;
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        ctx.font = `800 ${Math.round(f.size * S)}px ${getComputedFont()}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.8)'; ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
      if (G.freezeT > 0) {
        ctx.fillStyle = `rgba(127,224,255,${0.12 * Math.min(1, G.freezeT)})`; ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
    if (G && hero.hurtT > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(255,40,60,0)'); g.addColorStop(1, `rgba(255,40,60,${hero.hurtT * 0.5})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  let fontStack = null;
  function getComputedFont() { return fontStack || (fontStack = '"Noto Sans TC", "JetBrains Mono", system-ui, sans-serif'); }

  function drawMonster(m) {
    const x = monsterX(m) + (m.shakeT > 0 ? Math.sin(m.shakeT * 80) * 3 * S : 0);
    const y = m.isBoss ? groundY() : laneY(m.lane);
    const r = m.r * S;
    const col = theme.mon[m.type] || '#ffffff';
    const flash = m.flash > 0;
    ctx.save();
    if (m.doomed) {
      const k = m.doomT / 0.45;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.translate(x, y); ctx.scale(1 + k * 0.4, 1 - k * 0.3); ctx.translate(-x, -y);
    }
    if (m.special) {
      const sp = SPECIALS[m.special];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cy0 = y - r * 0.8 - (m.type === 'slime' ? 0 : r * 0.4);
      const g = ctx.createRadialGradient(x, cy0, r * 0.4, x, cy0, r * 2.4);
      g.addColorStop(0, rgba(sp.color, 0.4 + 0.15 * Math.sin(m.t * 6))); g.addColorStop(1, rgba(sp.color, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r * 2.4, cy0 - r * 2.4, r * 4.8, r * 4.8);
      ctx.restore();
    }
    let cy;
    if (m.isBoss) {
      const accent = G.cfg && G.cfg.theme === 3 ? '#ffb070' : G.cfg && G.cfg.theme === 2 ? '#a8f0ff' : '#ff4a6b';
      if (m.type === 'slime') { cy = drawSlime(x, y, r, col, m.t * 0.6, flash); drawCrown(x + r * 0.1, y - r * 1.25, r * 0.42); }
      else if (m.type === 'ghost') { cy = drawGhost(x, y - r * 0.4, r, col, m.t, flash); drawCrown(x - r * 0.1, y - r * 2.1 + Math.sin(m.t * 3) * r * 0.25, r * 0.32); }
      else if (m.type === 'golem') cy = drawGolem(x, y, r, G.cfg.theme === 2 ? '#7fa8c8' : '#5a3a34', m.t, flash, accent);
      else cy = drawLord(x, y, r, '#8a6bd8', m.t, flash, '#ff4a6b');
    } else if (m.type === 'slime') cy = drawSlime(x, y, r, col, m.t, flash);
    else if (m.type === 'ghost') cy = drawGhost(x, y, r, col, m.t, flash);
    else if (m.type === 'bat') cy = drawBat(x, y, r, col, m.t, flash);
    else cy = drawWisp(x, y, r, col, m.t, flash);
    ctx.restore();
    m.cy = cy;
    const k = m.isBoss ? { slime: 1.9, ghost: 2.9, golem: 2.4, lord: 3.1 }[m.type] : LABEL_K[m.type];
    m.labelY = y - r * k - (m.type === 'ghost' || m.type === 'bat' ? Math.sin(m.t * 3) * r * 0.2 : 0) - 8 * S;
    if (G.freezeT > 0 && !m.doomed) {
      ctx.fillStyle = 'rgba(180,240,255,0.35)';
      ctx.beginPath(); ctx.arc(x, cy, r * 1.2, 0, TAU); ctx.fill();
    }
  }

  function drawLabel(m, isTarget) {
    const word = m.word;
    let fs = m.isBoss ? Math.round(monFont() * 1.08) : monFont();
    ctx.font = `800 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
    let cw = ctx.measureText('M').width;
    const maxW = W - 40 * S - 20;
    if (cw * (word.length + 1.6) > maxW) {
      fs = Math.max(10, Math.floor(fs * maxW / (cw * (word.length + 1.6))));
      ctx.font = `800 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
      cw = ctx.measureText('M').width;
    }
    const sp = m.special ? SPECIALS[m.special] : null;
    const iconW = sp ? cw * 1.6 : 0;
    const w = cw * word.length + iconW;
    const padX = 9 * S, h = fs * 1.5;
    let lx = monsterX(m) - w / 2;
    lx = clamp(lx, padX + 4, W - w - padX - 4);
    let ly = Math.max(m.labelY, hudBottom + fs * (settings.meaning ? 2.2 : 1.3) + (m.isBoss ? 34 : 0));
    const boxX = lx - padX, boxY = ly - fs * 1.08, boxW = w + padX * 2;
    ctx.fillStyle = isTarget ? 'rgba(34,22,4,0.94)' : 'rgba(10,14,34,0.8)';
    rr(boxX, boxY, boxW, h, 7 * S); ctx.fill();
    if (isTarget) { ctx.strokeStyle = '#ffb547'; ctx.lineWidth = 2; ctx.stroke(); }
    else if (m.isBoss) { ctx.strokeStyle = 'rgba(255,107,74,0.7)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (sp) { ctx.fillStyle = sp.color; ctx.fillText(sp.icon, lx, ly); }
    const tx = lx + iconW;
    for (let i = 0; i < word.length; i++) {
      const c = word[i], x = tx + i * cw;
      if (i < m.typed) ctx.fillStyle = '#ffb547';
      else if (i === m.typed && isTarget) ctx.fillStyle = '#ffffff';
      else ctx.fillStyle = isTarget ? 'rgba(255,255,255,0.75)' : '#e8ecff';
      if (c === ' ') {
        if (i === m.typed && isTarget) { ctx.fillStyle = 'rgba(255,181,71,0.8)'; ctx.fillRect(x + cw * 0.15, ly + 3, cw * 0.7, 2.5); }
        continue;
      }
      ctx.fillText(c, x, ly);
      if (i === m.typed && isTarget) { ctx.fillStyle = '#ffb547'; ctx.fillRect(x, ly + 4, cw * 0.9, 2.5); }
    }
    if (settings.meaning && m.meaning) {
      const mfs = Math.round(fs * 0.62);
      ctx.font = `500 ${mfs}px ${getComputedFont()}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isTarget ? 'rgba(255,214,150,0.9)' : 'rgba(220,226,255,0.72)';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,14,34,0.7)';
      ctx.strokeText(m.meaning, boxX + boxW / 2, boxY - mfs * 0.35);
      ctx.fillText(m.meaning, boxX + boxW / 2, boxY - mfs * 0.35);
      ctx.textAlign = 'left';
    }
  }

  // ---------- HUD / UI ----------
  const hud = {
    el: $('#hud'), hp: $('#hp'), stage: $('#stageName'), prog: $('#progFill'),
    score: $('#score'), combo: $('#combo'), wpm: $('#wpm'), acc: $('#acc'), cache: {},
  };
  function wpm() { return G.activeTime > 2 ? Math.round((G.correct / 5) / (G.activeTime / 60)) : 0; }
  function acc() { const tot = G.correct + G.wrong; return tot ? Math.round((G.correct / tot) * 1000) / 10 : 100; }
  function setText(el, key, v) { if (hud.cache[key] !== v) { hud.cache[key] = v; el.textContent = v; } }
  function renderHud(force) {
    if (!G || G.demo) return;
    if (force) hud.cache = {};
    const hearts = '♥'.repeat(Math.max(0, G.hp)) + '|' + '♥'.repeat(Math.max(0, G.maxHp - G.hp));
    if (hud.cache.hp !== hearts) {
      hud.cache.hp = hearts;
      hud.hp.innerHTML = `<span class="on">${'♥'.repeat(Math.max(0, G.hp))}</span><span class="off">${'♥'.repeat(Math.max(0, G.maxHp - G.hp))}</span>`;
    }
    setText(hud.stage, 'stage', G.cfg ? `${G.cfg.label}・${G.cfg.name}` : '');
    const total = G.cfg ? G.cfg.count : 1;
    const remaining = G.toSpawn + G.monsters.filter((m) => !m.dead && !m.isBoss && !m.doomed).length;
    let prog = G.phase === 'bossIntro' || G.phase === 'boss' || G.phase === 'cleared' ? 100 : clamp(((total - remaining) / total) * 100, 0, 100);
    const pv = prog.toFixed(1) + '%';
    if (hud.cache.prog !== pv) { hud.cache.prog = pv; hud.prog.style.width = pv; }
    setText(hud.score, 'score', G.score.toLocaleString());
    setText(hud.combo, 'combo', String(G.combo));
    hud.combo.classList.toggle('hot', G.combo >= 10);
    setText(hud.wpm, 'wpm', String(wpm()));
    setText(hud.acc, 'acc', acc() + '%');
  }
  function bumpCombo() {
    if (G.demo) return;
    hud.combo.classList.remove('bump'); void hud.combo.offsetWidth; hud.combo.classList.add('bump');
  }

  const bannerEl = $('#banner');
  let bannerTimer = 0;
  function showBanner(eyebrow, title, sub, boss = false) {
    $('#bEyebrow').textContent = eyebrow; $('#bTitle').textContent = title; $('#bSub').textContent = sub || '';
    bannerEl.classList.toggle('boss', boss);
    bannerEl.hidden = true; void bannerEl.offsetWidth; bannerEl.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { bannerEl.hidden = true; }, 2300);
  }

  function showBossBar() {
    if (!G.boss) return;
    $('#bossbar').hidden = false;
    $('#bossName').textContent = `${G.boss.name}`;
    $('#bossPips').innerHTML = Array.from({ length: G.boss.maxHp }, (_, i) => `<i class="${i < G.boss.hp ? '' : 'gone'}"></i>`).join('');
  }
  function hideBossBar() { $('#bossbar').hidden = true; }

  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.hidden = true), 2600);
  }

  // ---------- 流程 ----------
  const menuEl = $('#menu'), pauseEl = $('#pause'), resultEl = $('#result');
  const kb = $('#kb');
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  function startGame(stage) {
    SFX.init();
    const s = stage != null ? stage : (settings.mode === 'adventure' ? settings.startStage : 0);
    newGame(settings.mode, settings.diff, false, s);
    menuEl.hidden = true; resultEl.hidden = true; pauseEl.hidden = true;
    hud.el.hidden = false; hideBossBar(); measureHud();
    $('#tapHint').hidden = !isTouch;
    focusKb();
  }
  function focusKb() { try { kb.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

  function startDemo() {
    newGame('endless', 'easy', true);
    hud.el.hidden = true; hideBossBar();
    $('#tapHint').hidden = true;
  }

  function togglePause(force) {
    if (!G || G.demo || G.phase === 'over' || G.phase === 'done') return;
    G.paused = force != null ? force : !G.paused;
    pauseEl.hidden = !G.paused;
    if (G.paused) $('#btnResume').focus(); else focusKb();
  }

  function stageStats() {
    const s = G.stageStart || { score: 0, correct: 0, wrong: 0, words: 0, time: 0 };
    const c = G.correct - s.correct, w = G.wrong - s.wrong, tm = G.activeTime - s.time;
    return {
      wpm: tm > 2 ? Math.round((c / 5) / (tm / 60)) : 0,
      acc: c + w ? Math.round((c / (c + w)) * 1000) / 10 : 100,
    };
  }

  function stageCleared() {
    G.phase = 'done';
    if (G.mode === 'endless') {
      G.hp = Math.min(G.maxHp, G.hp + 1);
      floater(heroX(), groundY() - 100 * S, '+1 ♥', '#ff7aa8', 22);
      G.wave++; beginSection();
      return;
    }
    const bonus = G.hp * 150 + (G.hurtThisStage ? 0 : 500);
    G.score += Math.round(bonus * G.d.mul);
    const unlocked = store.get('unlocked', {});
    unlocked[G.diff] = Math.max(unlocked[G.diff] || 1, G.stage + 2);
    store.set('unlocked', unlocked);
    const final = G.stage >= STAGES.length - 1;
    const st = stageStats();
    const stars = st.acc >= 96 ? 3 : st.acc >= 88 ? 2 : 1;
    const badges = [];
    if (!G.hurtThisStage) badges.push('無傷通關 +500');
    if (G.maxCombo >= 50) badges.push(`${G.maxCombo} 連擊大師`);
    if (st.wpm >= 60) badges.push('疾風之指');
    if (final) saveBest();
    showResult({
      eyebrow: final ? 'VICTORY' : `STAGE ${G.stage + 1} CLEAR`,
      title: final ? '你擊敗了暗影魔王！' : `${STAGES[G.stage].name} 已解放`,
      stars, badges, next: !final,
    });
    SFX.clear();
  }

  function gameOver() {
    G.phase = 'over'; hero.dead = true; hero.deadT = 0;
    G.target = null;
    hideBossBar();
    SFX.lose();
    setTimeout(() => {
      if (!G || G.phase !== 'over') return;
      G.phase = 'done';
      saveBest();
      showResult({
        eyebrow: 'GAME OVER',
        title: G.mode === 'endless' ? `撐到第 ${G.wave} 波` : `倒在${STAGES[G.stage].name}`,
        stars: 0, badges: G.isNewBest ? ['新紀錄！'] : [], next: false,
      });
    }, 1400);
  }

  function bestKey() { return `best:${G.mode}:${G.diff}`; }
  function saveBest() {
    const b = store.get(bestKey(), { score: 0, wpm: 0 });
    G.isNewBest = G.score > b.score;
    if (G.isNewBest) store.set(bestKey(), { score: G.score, wpm: wpm() });
    G.best = Math.max(b.score, G.score);
  }

  function showResult({ eyebrow, title, stars, badges, next }) {
    $('#resEyebrow').textContent = eyebrow;
    $('#resTitle').textContent = title;
    $('#resStars').innerHTML = stars ? [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : 'off'}">★</span>`).join('') : '';
    if (G.isNewBest && !badges.includes('新紀錄！')) badges.push('新紀錄！');
    $('#resBadges').innerHTML = badges.map((b) => `<span>${b}</span>`).join('');
    $('#rScore').textContent = G.score.toLocaleString();
    $('#rWpm').textContent = wpm();
    $('#rAcc').textContent = acc() + '%';
    $('#rCombo').textContent = G.maxCombo;
    $('#rWords').textContent = G.words;
    const best = G.best != null ? G.best : store.get(bestKey(), { score: 0 }).score;
    $('#rBest').textContent = Math.max(best, G.score).toLocaleString();
    const weak = Object.entries(G.miss).sort((a, b) => b[1] - a[1]).slice(0, 4);
    $('#resWeak').innerHTML = weak.length ? `最常打錯：${weak.map(([k, n]) => `<kbd>${k}</kbd>×${n}`).join(' ')}` : (G.correct > 20 ? '零失誤，完美的手指！' : '');
    const btnNext = $('#btnNext');
    btnNext.hidden = !next;
    $('#btnAgain').classList.toggle('btn-primary', !next);
    $('#btnAgain').classList.toggle('btn-ghost', !!next);
    $('#btnAgain').innerHTML = next ? '重玩本關' : '再玩一次 <kbd>Enter</kbd>';
    resultEl.hidden = false; hud.el.hidden = false;
    (next ? btnNext : $('#btnAgain')).focus();
  }

  function goMenu() {
    resultEl.hidden = true; pauseEl.hidden = true;
    menuEl.hidden = false;
    renderMenu();
    startDemo();
    $('#btnStart').focus();
  }

  // ---------- 選單 ----------
  function renderMenu() {
    document.querySelectorAll('#modeSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === settings.mode)));
    document.querySelectorAll('#diffSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.diff === settings.diff)));
    $('#optMeaning').checked = settings.meaning;
    $('#optSound').checked = settings.sound;
    $('#btnSound2').classList.toggle('muted', !settings.sound);
    const unlocked = (store.get('unlocked', {})[settings.diff]) || 1;
    if (settings.startStage >= unlocked) settings.startStage = 0;
    $('#stageField').hidden = settings.mode !== 'adventure';
    $('#stageChips').innerHTML = STAGES.map((s, i) =>
      `<button type="button" role="radio" data-stage="${i}" aria-checked="${i === settings.startStage}" ${i < unlocked ? '' : 'disabled title="通過前一關解鎖"'}><span class="n">${i + 1}</span>${i < unlocked ? s.name : '未解鎖'}</button>`).join('');
    $('#btnStart').innerHTML = (settings.mode === 'adventure' ? '開始冒險' : '開始挑戰') + ' <kbd>Enter</kbd>';
    const b = store.get(`best:${settings.mode}:${settings.diff}`, null);
    $('#bestLine').innerHTML = b && b.score ? `${DIFF[settings.diff].name}・最高分 <b>${b.score.toLocaleString()}</b>　WPM <b>${b.wpm}</b>` : '還沒有紀錄，來創造第一筆吧';
  }

  $('#modeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    settings.mode = b.dataset.mode; saveSettings(); renderMenu();
  });
  $('#diffSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    settings.diff = b.dataset.diff; saveSettings(); renderMenu();
  });
  $('#stageChips').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    settings.startStage = Number(b.dataset.stage); saveSettings(); renderMenu();
  });
  $('#optMeaning').addEventListener('change', (e) => { settings.meaning = e.target.checked; saveSettings(); });
  $('#optSound').addEventListener('change', (e) => { settings.sound = e.target.checked; saveSettings(); renderMenu(); if (settings.sound) SFX.init(); });
  $('#btnSound2').addEventListener('click', () => { settings.sound = !settings.sound; saveSettings(); $('#btnSound2').classList.toggle('muted', !settings.sound); SFX.init(); focusKb(); toast(settings.sound ? '音效開啟' : '音效關閉'); });
  $('#btnStart').addEventListener('click', () => startGame());
  $('#btnPause').addEventListener('click', () => togglePause());
  $('#btnResume').addEventListener('click', () => togglePause(false));
  $('#btnRestart').addEventListener('click', () => startGame(G && G.mode === 'adventure' ? G.stage : null));
  $('#btnQuit').addEventListener('click', goMenu);
  $('#btnMenu').addEventListener('click', goMenu);
  $('#btnAgain').addEventListener('click', () => {
    startGame(G && G.mode === 'adventure' ? G.stage : 0);
  });
  $('#btnNext').addEventListener('click', () => {
    if (!G) return;
    resultEl.hidden = true;
    G.stage++;
    hero.dead = false;
    G.hp = Math.min(G.maxHp, G.hp + 1);
    beginSection();
    focusKb();
  });
  $('#tapHint').addEventListener('click', () => { focusKb(); $('#tapHint').hidden = true; });
  canvas.addEventListener('pointerdown', () => { if (inPlay() || (G && G.phase === 'intro' && !G.demo)) focusKb(); });

  // ---------- 鍵盤 ----------
  const overlayOpen = () => !menuEl.hidden || !resultEl.hidden || !pauseEl.hidden;
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Process') { if (G && !G.demo) toast('偵測到中文輸入法，請切換成英文輸入（按 Shift 或切換輸入法）'); return; }
    const onControl = e.target instanceof HTMLElement && e.target.matches('button, input[type=checkbox]');
    if (k === 'Escape') {
      e.preventDefault();
      if (G && !G.demo && (inPlay() || G.paused || G.phase === 'intro')) togglePause();
      return;
    }
    if (k === 'Enter') {
      if (!menuEl.hidden) { e.preventDefault(); startGame(); return; }
      if (onControl) return; // 讓瀏覽器觸發按鈕本身
      e.preventDefault();
      if (!pauseEl.hidden) togglePause(false);
      else if (!resultEl.hidden) (!$('#btnNext').hidden ? $('#btnNext') : $('#btnAgain')).click();
      return;
    }
    if (overlayOpen()) return;
    if (k === 'Backspace') { if (inPlay()) { e.preventDefault(); releaseTarget(); } return; }
    if (k.length === 1 && G && !G.demo && !G.paused) {
      if (!inPlay()) { if (k === ' ') e.preventDefault(); return; }
      e.preventDefault();
      if (/[^\x00-\x7f]/.test(k)) { toast('請切換成英文輸入法'); return; }
      handleChar(k);
    }
  });
  // 手機虛擬鍵盤：keydown 不一定帶字元，改從 input 事件讀
  kb.addEventListener('input', () => {
    const v = kb.value; kb.value = '';
    if (!inPlay()) return;
    if (/[^\x00-\x7f]/.test(v)) { toast('請切換成英文輸入法'); return; }
    for (const ch of v) handleChar(ch);
  });
  kb.addEventListener('compositionend', () => { kb.value = ''; });
  window.addEventListener('blur', () => { if (inPlay()) togglePause(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inPlay()) togglePause(true); });

  // 測試／除錯用：在主控台輸入 __wordblade.G 查看狀態
  window.__wordblade = { get G() { return G; } };

  // ---------- 啟動 ----------
  window.addEventListener('resize', resize);
  // 手機鍵盤彈出時，讓遊戲畫面縮到可視區域內
  if (window.visualViewport) {
    const fit = () => {
      const app = document.getElementById('app');
      app.style.height = Math.round(window.visualViewport.height) + 'px';
      window.scrollTo(0, 0);
      resize();
    };
    window.visualViewport.addEventListener('resize', fit);
    fit();
  }
  resize();
  renderMenu();
  startDemo();
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
