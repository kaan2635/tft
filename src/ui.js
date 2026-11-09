/* =====================================================================
   TFT ARENA — OFFLINE  |  ui.js
   Render, sürükle-bırak, tooltip, savaş görselleri, modallar
   ===================================================================== */
window.TFT = window.TFT || {};
(function () {
  'use strict';
  const TFT = window.TFT;
  const DATA = TFT.DATA;
  const CH = DATA.CHAMP_BY_ID;
  const Hex = TFT.Hex;
  let G, S;

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let hexW = 68, hexH = 78;
  let combatTokens = new Map();
  let fxEls = [];
  let combatEndDelay = -1;
  let lastOppLabel = '';
  let soundOn = true;
  let audioCtx = null;

  /* ================= SES ================= */
  function sfx(kind) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      let f = 440, d = 0.08, type = 'sine', vol = 0.045;
      switch (kind) {
        case 'buy': f = 520; d = 0.07; break;
        case 'sell': f = 300; d = 0.1; break;
        case 'roll': f = 380; d = 0.05; type = 'triangle'; break;
        case 'xp': f = 700; d = 0.07; break;
        case 'level': f = 880; d = 0.2; type = 'triangle'; vol = 0.06; break;
        case 'star': f = 1040; d = 0.25; type = 'triangle'; vol = 0.06; break;
        case 'item': f = 620; d = 0.1; type = 'square'; vol = 0.03; break;
        case 'place': f = 260; d = 0.04; break;
        case 'combat': f = 160; d = 0.3; type = 'sawtooth'; vol = 0.03; break;
        case 'win': o.frequency.setValueAtTime(523, t); o.frequency.setValueAtTime(659, t + 0.1); o.frequency.setValueAtTime(784, t + 0.2); d = 0.4; break;
        case 'lose': o.frequency.setValueAtTime(392, t); o.frequency.setValueAtTime(311, t + 0.12); o.frequency.setValueAtTime(233, t + 0.24); d = 0.45; break;
        case 'augment': f = 940; d = 0.22; type = 'sine'; vol = 0.05; break;
        default: break;
      }
      o.type = type;
      if (kind !== 'win' && kind !== 'lose') o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d + 0.02);
    } catch (e) { }
  }

  /* ================= LAYOUT ================= */
  function applyHexSize(size) {
    hexW = size;
    hexH = size * 1.1547;
    document.documentElement.style.setProperty('--hexW', hexW + 'px');
    document.documentElement.style.setProperty('--hexH', hexH + 'px');
    const board = $('#board');
    if (board) {
      board.style.width = (7 * hexW + hexW * 0.5) + 'px';
      board.style.height = (8 * hexH * 0.76 + hexH * 0.24) + 'px';
    }
    buildHexes();
  }

  function layout() {
    const center = $('#center');
    if (!center) return;
    const cw = center.clientWidth || 600;
    const chh = center.clientHeight || 600;
    const byW = (cw - 26) / 7.6;
    const byH = (chh - 96) / 7.35;
    let size = Math.max(26, Math.min(byW, byH, 82));
    applyHexSize(size);

    // gerçek ölçümle sığdır (bench satır kaydırabilir)
    const boardEl = $('#board');
    const benchWrap = $('#bench-wrap');
    if (boardEl && benchWrap && center.clientHeight > 50) {
      const avail = center.clientHeight - 8;
      const bh = boardEl.offsetHeight || 0;
      const hh = benchWrap.offsetHeight || 0;
      if (bh + hh > avail && bh > 0) {
        const k = Math.max(0.45, (avail - hh) / bh);
        size = Math.max(24, Math.min(size * k, size));
        applyHexSize(size);
      }
    }
    if (S && S.phase !== 'combat') renderBoardUnits();
    if (S && S.phase === 'combat') positionCombatTokens(true);
  }

  function buildHexes() {
    const layer = $('#hex-layer');
    if (!layer) return;
    layer.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 7; c++) {
        const d = document.createElement('div');
        d.className = 'hex' + (r < 4 ? ' enemy' : '');
        d.dataset.r = r; d.dataset.c = c;
        d.style.left = (c * hexW + (r % 2 ? hexW / 2 : 0)) + 'px';
        d.style.top = (r * hexH * 0.76) + 'px';
        d.innerHTML = '<div class="hex-glow"></div>';
        layer.appendChild(d);
      }
    }
    const mid = document.createElement('div');
    mid.className = 'board-mid-line';
    mid.style.top = (4 * hexH * 0.76 - 1) + 'px';
    layer.appendChild(mid);
  }

  function hexCenter(r, c) {
    return { x: c * hexW + (r % 2 ? hexW / 2 : 0) + hexW / 2, y: r * hexH * 0.76 + hexH / 2 };
  }

  /* ================= TOKEN ================= */
  function champOf(u) {
    if (u.champId) return CH[u.champId];
    return { name: u.name, icon: u.icon, cost: 0, traits: [], hp: u.baseHp, ad: u.baseAd, as: u.baseAs, armor: u.baseArmor, mr: u.baseMr, range: u.baseRange, mana: 0, ability: null };
  }

  function tokenHTML(u, opts) {
    opts = opts || {};
    const ch = champOf(u);
    const star = u.star || 1;
    const cost = ch.cost || 0;
    const enemy = opts.enemy;
    const stars = Array.from({ length: star }, () => `<span class="s${Math.min(3, star)}">★</span>`).join('');
    const items = (u.items || []).map(it => `<div class="mini-item ${it.completed ? 'completed' : ''}" title="${it.name}">${it.icon}</div>`).join('');
    const hpPct = opts.combat ? clamp((u.hp / u.maxHp) * 100, 0, 100) : 100;
    const manaPct = opts.combat && u.maxMana ? clamp((u.mana / u.maxMana) * 100, 0, 100) : 0;
    const shieldPct = opts.combat && u.shield ? clamp((u.shield / u.maxHp) * 100, 0, 100) : 0;
    return `
      <div class="unit-inner">
        <div class="unit-ring"></div>
        <div class="unit-portrait">${ch.icon}</div>
        <div class="unit-stars">${stars}</div>
        ${(u.items && u.items.length) ? `<div class="unit-items">${items}</div>` : ''}
        ${opts.bench ? '' : `<div class="unit-bars">
          <div class="hp-bar"><i style="width:${hpPct}%"></i>${shieldPct ? `<div class="shield" style="width:${shieldPct}%"></div>` : ''}</div>
          ${u.maxMana ? `<div class="mana-bar"><i style="width:${manaPct}%"></i></div>` : ''}
        </div>`}
        <div class="cast-flash"></div>
      </div>`;
  }

  function makeToken(u, opts) {
    const ch = champOf(u);
    const d = document.createElement('div');
    d.className = `unit-token c${ch.cost || 1}` + (opts.enemy ? ' enemy-token' : '');
    d.dataset.uid = u.uid;
    d.innerHTML = tokenHTML(u, opts);
    if (opts.bench) {
      d.style.position = 'absolute';
      d.style.left = '50%'; d.style.top = '50%';
      d.style.transform = 'translate(-50%,-50%)';
    } else {
      const p = hexCenter(u.r, u.c);
      d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    }
    return d;
  }

  function renderBoardUnits() {
    const layer = $('#unit-layer');
    if (!layer) return;
    layer.innerHTML = '';
    combatTokens.clear();
    if (!S) return;
    if (S.phase === 'combat' && S.combat) return;
    S.board.forEach(u => {
      const t = makeToken(u, {});
      layer.appendChild(t);
    });
  }

  function renderBench() {
    const bench = $('#bench');
    if (!bench) return;
    bench.innerHTML = '';
    for (let i = 0; i < DATA.BENCH_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = 'bench-slot';
      slot.dataset.bench = i;
      const u = S.bench[i];
      if (u) slot.appendChild(makeToken(u, { bench: true }));
      bench.appendChild(slot);
    }
  }

  function renderItems() {
    const wrap = $('#item-bench');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let i = 0; i < DATA.ITEM_BENCH_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = 'item-slot' + (S.items[i] ? ' filled ' + (S.items[i].comp ? 'component' : 'completed') : '');
      slot.dataset.item = i;
      if (S.items[i]) slot.innerHTML = `<span class="item-ico">${S.items[i].icon}</span>`;
      wrap.appendChild(slot);
    }
  }

  function renderShop() {
    const shop = $('#shop');
    if (!shop) return;
    shop.innerHTML = '';
    S.shop.forEach((id, i) => {
      if (!id) {
        const d = document.createElement('div');
        d.className = 'shop-card sold';
        d.innerHTML = `<div class="sc-portrait" style="opacity:.2">·</div><div class="sc-main"><div class="sc-name" style="color:#3f5474">—</div></div>`;
        shop.appendChild(d);
        return;
      }
      const ch = CH[id];
      const owned = S.bench.concat(S.board).filter(u => u && u.champId === id).length;
      const d = document.createElement('div');
      d.className = 'shop-card c' + ch.cost + (owned >= 2 ? ' owned' : '');
      d.dataset.shop = i;
      d.innerHTML = `
        <div class="sc-portrait">${ch.icon}</div>
        <div class="sc-main">
          <div class="sc-name">${ch.name}</div>
          <div class="sc-traits">${ch.traits.map(t => DATA.TRAITS[t].icon + ' ' + DATA.TRAITS[t].name).join(' · ')}</div>
        </div>
        <div class="sc-cost">${ch.cost}</div>`;
      shop.appendChild(d);
    });
    const lock = $('#shop-lock');
    if (lock) { lock.textContent = S.shopLocked ? '🔒' : '🔓'; lock.classList.toggle('on', S.shopLocked); }
    const rb = $('#btn-reroll');
    if (rb) {
      const cost = Math.max(0, DATA.REROLL_COST - (S.buffs.rerollDiscount || 0));
      rb.querySelector('.btn-cost').textContent = cost;
      rb.classList.toggle('disabled', S.gold < cost);
    }
    const xb = $('#btn-xp');
    if (xb) {
      xb.classList.toggle('disabled', S.gold < DATA.XP_COST || S.level >= DATA.MAX_LEVEL);
      const odds = DATA.SHOP_ODDS[Math.min(9, S.level + (S.buffs.shopOdds || 0))] || [];
      xb.title = `Seviye ${S.level} mağaza oranları: ` + odds.map((o, i) => `${i + 1}🪙 %${o}`).join(' · ');
    }
  }

  /* ================= TRAITS ================= */
  function renderTraits() {
    const list = $('#traits-list');
    const mini = $('#traits-mini');
    if (!list) return;
    const counts = G.traitCounts();
    const rows = [];
    Object.keys(counts).forEach(t => {
      const def = DATA.TRAITS[t]; if (!def) return;
      let tier = 0; def.tiers.forEach((tt, i) => { if (counts[t] >= tt.n) tier = i + 1; });
      rows.push({ id: t, count: counts[t], tier, def });
    });
    // aktif olanlar önce
    rows.sort((a, b) => (b.tier - a.tier) || (b.count - a.count));
    list.innerHTML = rows.map(r => {
      const tierMax = r.def.tiers.length;
      const dots = r.def.tiers.map((tt, i) => `<span class="${i < r.tier ? 'on' : ''}">${tt.n}</span>`).join('');
      return `<div class="trait-row ${r.tier ? 'active tier-' + Math.min(3, r.tier) : ''}" data-trait="${r.id}">
        <div class="tr-ico">${r.def.icon}</div>
        <div class="tr-main">
          <div class="tr-name">${r.def.name}</div>
          <div class="tr-tier">${dots}</div>
        </div>
        <div class="tr-count">${r.count}<em>/${r.def.tiers[0].n}</em></div>
      </div>`;
    }).join('') || `<div style="color:#4d6080;font-size:11px;padding:8px;text-align:center">Sinerji yok<br><span style="font-size:9px">Tahtaya birim yerleştir</span></div>`;

    if (mini) {
      mini.innerHTML = rows.filter(r => r.tier).map(r =>
        `<div class="tm-chip on" data-trait="${r.id}" title="${r.def.name} ${r.count}"><span>${r.def.icon}</span><span class="tm-n">${r.count}</span></div>`
      ).join('') || `<div style="color:#3f5474;font-size:9px">Aktif sinerji yok</div>`;
    }
  }

  function showTraitDetail(id) {
    const box = $('#trait-detail');
    if (!box) return;
    const def = DATA.TRAITS[id];
    const counts = G.traitCounts();
    const count = counts[id] || 0;
    let tier = 0; def.tiers.forEach((tt, i) => { if (count >= tt.n) tier = i + 1; });
    box.innerHTML = `<h4>${def.icon} ${def.name} <span style="color:#63799a;font-size:10px">${def.kind}</span></h4>
      <div style="color:#7f93b3">Aktif birim: <b style="color:#dfeaff">${count}</b></div>
      ${def.tiers.map((tt, i) => `<div class="td-tier ${i === tier - 1 || (tier === 0 && i === 0) ? 'on' : ''}">
        <b>${tt.n}</b> · ${tt.desc}</div>`).join('')}`;
    box.classList.remove('hidden');
  }

  /* ================= TOP BAR / BARS ================= */
  function renderTopbar() {
    const sr = $('#stage-round'), sn = $('#stage-name');
    if (sr) sr.textContent = S.stage + '-' + S.round;
    if (sn) {
      sn.textContent = S.phase === 'combat' ? 'SAVAŞ' :
        S.phase === 'carousel' ? 'CAROUSEL' :
        S.roundType === 'pve' ? 'PvE Turu' : S.roundType === 'carousel' ? 'Carousel' : 'PvP Turu';
    }
    renderPlayers();
  }

  function renderPlayers() {
    const strip = $('#players-strip');
    if (!strip) return;
    const all = [{ id: 'me', name: 'SEN', icon: '🧙', hp: S.hp, alive: S.alive, isMe: true, streak: S.streak, level: S.level }].concat(S.bots);
    all.sort((a, b) => (b.alive ? 1 : 0) - (a.alive ? 1 : 0));
    strip.innerHTML = all.map(p => {
      const pct = clamp(p.hp, 0, 100);
      const low = p.hp <= 30;
      const streakTag = Math.abs(p.streak || 0) >= 2 ? `<div class="pc-streak">${p.streak > 0 ? '🔥' : '❄️'}${Math.abs(p.streak)}</div>` : '';
      return `<div class="player-chip ${p.isMe ? 'me' : ''} ${p.alive ? '' : 'dead'}" data-player="${p.id}" title="${p.name} — ${p.hp} can">
        ${streakTag}
        <div class="pc-ava">${p.icon}</div>
        <div class="pc-body">
          <div class="pc-name">${p.name}</div>
          <div class="pc-hp ${low ? 'low' : ''}">${p.alive ? p.hp : '☠'}</div>
          <div class="pc-bar"><i class="${low ? 'low' : ''}" style="width:${pct}%"></i></div>
        </div>
      </div>`;
    }).join('');
  }

  function renderBars() {
    const hp = $('#player-hp'), gold = $('#player-gold'), lvl = $('#player-level'), streak = $('#player-streak');
    if (hp) hp.textContent = S.hp;
    if (gold) gold.textContent = S.gold;
    if (lvl) lvl.textContent = S.level;
    if (streak) {
      const s = S.streak;
      streak.textContent = s === 0 ? '0' : (s > 0 ? '+' + s : s);
      streak.style.color = s > 0 ? '#4ad48a' : s < 0 ? '#ff7b7b' : '#fff';
    }
    const xf = $('#xp-fill'), xt = $('#xp-text');
    if (xf) {
      const need = DATA.XP_TABLE[S.level] || 1;
      const pct = S.level >= DATA.MAX_LEVEL ? 100 : (S.xp / need) * 100;
      xf.style.width = pct + '%';
      if (xt) xt.textContent = S.level >= DATA.MAX_LEVEL ? 'MAX' : `${S.xp}/${need}`;
    }
    const pills = $('#board-pills');
    if (pills) {
      const cap = 5 + (S.buffs.interestCap || 0);
      const interest = Math.min(cap, Math.floor(S.gold / 10));
      pills.innerHTML = `<div class="board-pill">TAKIM <b>${G.boardCount()}/${G.teamSize()}</b></div>
        <div class="board-pill">SEVİYE <b>${S.level}</b></div>
        <div class="board-pill" title="Her 10 altın için 1 faiz (üst sınır ${cap})">FAİZ <b>+${interest}</b></div>
        <div class="board-pill">AUGMENT <b>${S.augments.length}</b></div>
        <div class="board-pill">TUR <b>${S.stage}-${S.round}</b></div>`;
    }
    renderShop();
    const rb = $('#btn-ready');
    if (rb) {
      const active = S.phase === 'planning' || S.phase === 'carousel';
      rb.style.opacity = active ? 1 : 0.4;
    }
  }

  function renderTimer() {
    const ring = $('#ring-fg'), txt = $('#timer-text'), box = $('#round-timer');
    if (!ring) return;
    let pct, label;
    if (S.phase === 'combat' && S.combat) {
      const left = Math.max(0, S.combat.maxTime - S.combat.time);
      pct = left / S.combat.maxTime; label = Math.ceil(left);
    } else if (S.phase === 'planning' || S.phase === 'carousel') {
      pct = clamp(S.timer / (S.timerMax || 30), 0, 1); label = Math.ceil(S.timer);
    } else if (S.phase === 'result') {
      pct = clamp(S.resultTimer / 2.4, 0, 1); label = '…';
    } else { pct = 0; label = '—'; }
    ring.style.strokeDashoffset = (100.5 * (1 - clamp(pct, 0, 1))) + '';
    if (txt) txt.textContent = label;
    if (box) box.classList.toggle('urgent', label <= 5 && typeof label === 'number');
  }

  /* ================= UNIT INFO ================= */
  function renderInfo() {
    const box = $('#unit-info');
    if (!box) return;
    const u = S.selectedUid ? G.unitByUid(S.selectedUid) : null;
    if (!u) {
      box.innerHTML = `<div class="up-empty">Bir birim seç<br><span style="font-size:9px;color:#3f5474">Bilgi ve satış için tıkla</span></div>`;
      return;
    }
    const ch = CH[u.champId];
    const hp = Math.round(ch.hp * DATA.STAR_MULT.hp[u.star - 1]);
    const ad = Math.round(ch.ad * DATA.STAR_MULT.ad[u.star - 1]);
    const items = u.items.map(it => `<span title="${it.name}: ${it.desc || ''}">${it.icon}</span>`).join(' ');
    box.innerHTML = `
      <div class="up-portrait">${ch.icon}</div>
      <div class="up-main">
        <div class="up-name">${ch.name} <span style="color:#ffd166">${'★'.repeat(u.star)}</span> <span class="up-cost">${ch.cost}</span></div>
        <div class="up-traits">${ch.traits.map(t => DATA.TRAITS[t].icon + ' ' + DATA.TRAITS[t].name).join(' · ')}</div>
        <div class="up-stats">
          <div>❤️ <b>${hp}</b></div><div>⚔️ <b>${ad}</b></div>
          <div>🛡️ <b>${ch.armor}</b></div><div>🔮 <b>${ch.mr}</b></div>
          <div>🏹 <b>${ch.range}</b></div><div>💧 <b>${ch.mana}</b></div>
        </div>
        <div class="up-ability">✨ <b>${ch.ability.name}</b> — ${DATA.abilityText(ch, u.star)}</div>
        <div style="margin-top:3px;font-size:12px">${items || '<span style="color:#3f5474;font-size:9px">Eşya yok</span>'}</div>
      </div>
      <button class="up-sell" data-sell="${u.uid}">SAT ${G.sellPrice(u)}🪙</button>`;
  }

  function renderLog() {
    // opsiyonel: log paneli yok, toast yeterli
  }

  /* ================= TOOLTIP ================= */
  const tip = { el: null };
  function showTooltip(html, x, y) {
    const el = $('#tooltip');
    if (!el) return;
    el.innerHTML = html;
    el.classList.remove('hidden');
    const pad = 14;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      let left = x + pad, top = y + pad;
      if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
      if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
      el.style.left = Math.max(6, left) + 'px';
      el.style.top = Math.max(6, top) + 'px';
    });
  }
  function hideTooltip() { const el = $('#tooltip'); if (el) el.classList.add('hidden'); }
  function showUnitTooltip(u, x, y, enemy) {
    if (!u) return;
    const ch = champOf(u);
    const star = u.star || 1;
    const traits = (ch.traits || []).map(t => {
      const d = DATA.TRAITS[t];
      return `<div class="tt-trait"><b>${d.icon} ${d.name}</b> · ${d.tiers.map(tt => tt.n).join('/')}</div>`;
    }).join('');
    const items = (u.items || []).map(it => `<div class="tt-trait" style="color:#ffd166">${it.icon} <b>${it.name}</b> — ${it.desc || DATA.SPECIAL_DESC[it.special] || ''}</div>`).join('');
    const stats = u.maxHp && u.maxMana !== undefined
      ? `<div class="tt-stat">❤️ <b>${Math.round(u.hp)}/${Math.round(u.maxHp)}</b> · ⚔️ <b>${Math.round(u.ad)}</b> · 🛡️ <b>${Math.round(u.armor)}</b> · 🔮 <b>${Math.round(u.mr)}</b></div>`
      : `<div class="tt-stat">❤️ <b>${Math.round(ch.hp * DATA.STAR_MULT.hp[star - 1])}</b> · ⚔️ <b>${Math.round(ch.ad * DATA.STAR_MULT.ad[star - 1])}</b> · 🛡️ <b>${ch.armor}</b> · 🔮 <b>${ch.mr}</b> · 🏹 <b>${ch.range}</b></div>`;
    showTooltip(`
      <h4>${ch.icon} ${ch.name} <span style="color:${['#8b9bb7', '#4ad48a', '#3ba7ff', '#b06bff', '#f2c14e'][ch.cost - 1] || '#fff'}">${'★'.repeat(star)}</span></h4>
      <div class="tt-sub">${(ch.traits || []).map(t => DATA.TRAITS[t].name).join(' · ')}</div>
      ${stats}
      ${ch.ability ? `<div class="tt-ability">✨ <b>${ch.ability.name}</b><br>${ch.ability.text || ''}<br><span style="color:#8be0a0">${DATA.abilityText(ch, star)}</span></div>` : ''}
      ${traits}${items}
      ${ch.cost ? `<div class="tt-sub" style="margin-top:4px">Satış: <span class="tt-gold">${G.sellPrice(u)}🪙</span></div>` : ''}
    `, x, y);
  }
  function showChampTooltip(ch, x, y) {
    showTooltip(`
      <h4>${ch.icon} ${ch.name} <span style="color:${['#8b9bb7', '#4ad48a', '#3ba7ff', '#b06bff', '#f2c14e'][ch.cost - 1]}">${'★'.repeat(1)}</span></h4>
      <div class="tt-sub">${ch.traits.map(t => DATA.TRAITS[t].icon + ' ' + DATA.TRAITS[t].name).join(' · ')}</div>
      <div class="tt-stat">❤️ <b>${ch.hp}</b> · ⚔️ <b>${ch.ad}</b> · 🛡️ <b>${ch.armor}</b> · 🔮 <b>${ch.mr}</b> · 🏹 <b>${ch.range}</b></div>
      <div class="tt-ability">✨ <b>${ch.ability.name}</b><br>${ch.ability.text}<br><span style="color:#8be0a0">${DATA.abilityText(ch, 1)}</span></div>
      <div class="tt-sub" style="margin-top:4px">Fiyat: <span class="tt-gold">${ch.cost}🪙</span></div>
    `, x, y);
  }
  function showItemTooltip(it, x, y) {
    showTooltip(`<h4>${it.icon} ${it.name}</h4>
      <div class="tt-stat">${it.desc || DATA.statText(it.stats || {})}</div>
      ${it.special ? `<div class="tt-ability">${DATA.SPECIAL_DESC[it.special] || ''}</div>` : ''}
      ${it.comp ? '<div class="tt-sub">Bileşen — başka bir bileşenle birleştir</div>' : ''}`, x, y);
  }
  function showTraitTooltip(id, x, y) {
    const def = DATA.TRAITS[id]; if (!def) return;
    const c = G.traitCounts()[id] || 0;
    showTooltip(`<h4>${def.icon} ${def.name}</h4>
      <div class="tt-sub">${def.kind} · ${c} birim</div>
      ${def.tiers.map(t => `<div class="tt-trait" style="margin-top:2px"><b>(${t.n})</b> ${t.desc}</div>`).join('')}`, x, y);
  }

  /* ================= TOAST ================= */
  function toast(msg, kind) {
    const root = $('#toast-root');
    if (!root) return;
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.textContent = msg;
    root.appendChild(d);
    setTimeout(() => { d.style.transition = 'opacity .3s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 320); }, 1900);
    while (root.children.length > 4) root.firstChild.remove();
  }

  /* ================= MODAL ================= */
  function openModal(html, opts) {
    const root = $('#modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal">${html}</div>`;
    root.classList.remove('hidden');
    if (opts && opts.dismissable) {
      root.onclick = e => { if (e.target === root) hideModal(); };
    } else root.onclick = null;
  }
  function hideModal() {
    const root = $('#modal-root');
    if (!root) return;
    root.classList.add('hidden');
    root.innerHTML = '';
    root.onclick = null;
  }

  function showCarousel(opts) {
    const html = `
      <h2>🎠 Carousel</h2>
      <p class="sub">Bir şampiyon ve üzerindeki eşyayı seç. Seçtiğin birim yedek alanına gelir.</p>
      <div class="carousel-grid">
        ${opts.map((o, i) => {
      const ch = CH[o.champId];
      return `<div class="carousel-card" data-carousel="${i}">
            <div class="cc-ico">${ch.icon}</div>
            <div class="cc-name">${ch.name}</div>
            <div class="cc-traits">${ch.traits.map(t => DATA.TRAITS[t].icon).join(' ')}</div>
            <div class="cc-item">${o.item.icon} ${o.item.name}</div>
          </div>`;
    }).join('')}
      </div>
      <p class="sub" style="margin-top:12px;text-align:center">Süre: <span id="carousel-timer">20</span> sn · süre biterse en pahalı birim otomatik alınır</p>`;
    openModal(html);
    $('#modal-root').querySelectorAll('[data-carousel]').forEach(el => {
      el.addEventListener('click', () => G.pickCarousel(+el.dataset.carousel));
      el.addEventListener('mouseenter', e => showChampTooltip(CH[opts[+el.dataset.carousel].champId], e.clientX, e.clientY));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  function showAugments(pool) {
    const html = `
      <h2>🧩 Augment Seç</h2>
      <p class="sub">Bu tur için kalıcı bir güçlendirme seç. Seçim tüm oyun boyunca geçerli.</p>
      <div class="augment-grid">
        ${pool.map(a => `<div class="augment-card" data-augment="${a.id}">
          <div class="ag-tier">${a.tier}</div>
          <div class="ag-ico">${a.icon}</div>
          <div class="ag-name">${a.name}</div>
          <div class="ag-desc">${a.desc}</div>
        </div>`).join('')}
      </div>`;
    openModal(html);
    $('#modal-root').querySelectorAll('[data-augment]').forEach(el => {
      el.addEventListener('click', () => G.pickAugment(el.dataset.augment));
    });
  }

  function showGameOver(win) {
    const place = S.place || 8;
    const ord = place === 1 ? '1.' : place + '.';
    const t = Math.round((Date.now() - S.stats.startTime) / 1000);
    const mm = Math.floor(t / 60), ss = t % 60;
    const html = `
      <h2 style="text-align:center">${win ? '🏆 ZAFER!' : '💀 Oyun Bitti'}</h2>
      <div class="result-place">${ord}</div>
      <div class="result-title">${win ? 'Arena şampiyonu sen oldun' : 'Elendin'}</div>
      <div class="result-sub">${win ? 'Tüm botları yendin. Muhteşem!' : 'Daha iyi bir komp ile tekrar dene.'}</div>
      <table class="stats-table">
        <tr><td>Toplam tur</td><td>${S.stats.rounds}</td></tr>
        <tr><td>Galibiyet / Mağlubiyet</td><td>${S.stats.wins} / ${S.stats.losses}</td></tr>
        <tr><td>En uzun seri</td><td>${S.stats.maxStreak}</td></tr>
        <tr><td>Alınan birim</td><td>${S.stats.unitsBought}</td></tr>
        <tr><td>Augment</td><td>${S.augments.length}</td></tr>
        <tr><td>Süre</td><td>${mm} dk ${ss} sn</td></tr>
        <tr><td>En iyi derecen</td><td>${(S.best || G.getBest() || 9) === 9 ? '—' : (S.best || G.getBest()) + '.'}</td></tr>
      </table>
      <div class="modal-actions"><button class="btn ready" id="btn-restart">YENİ OYUN ⟳</button></div>`;
    openModal(html);
    const b = $('#btn-restart');
    if (b) b.addEventListener('click', () => G.restart());
    sfx(win ? 'win' : 'lose');
  }

  function showHelp() {
    openModal(`
      <h2>❔ Nasıl Oynanır</h2>
      <p class="sub">TFT Arena — tamamen offline, 7 bot oyuncuya karşı otomatik savaş oyunu.</p>
      <div class="help-grid">
        <div>
          <h4>Temel Akış</h4>
          Her turda <b>mağazadan şampiyon al</b>, yedek alanına sürükle ve tahtaya yerleştir.
          3 aynı şampiyon birleşerek <b>2★</b>, 3 tane 2★ ise <b>3★</b> olur. Hazır olunca <span class="help-key">R</span> ile savaşı başlat.
        </div>
        <div>
          <h4>Ekonomi</h4>
          Tur başına 5 altın + <b>faiz</b> (her 10 altın için 1, en fazla 5) + <b>seri bonusu</b> kazanırsın.
          <span class="help-key">D</span> yenile (2 altın), <span class="help-key">F</span> XP al (4 altın).
        </div>
        <div>
          <h4>Sinerjiler</h4>
          Aynı sinerjiye sahip <b>farklı</b> şampiyonlar tahtadayken eşik değerlerine ulaşınca güç kazanırsın.
          Sol paneldeki sinerjiye tıklayarak detayları görebilirsin.
        </div>
        <div>
          <h4>Eşyalar</h4>
          İki <b>bileşen</b> eşyayı üst üste sürükleyerek tamamlanmış eşya yap. Tamamlanmış eşyayı birime sürükleyerek tak.
          Bir birim en fazla <b>3 eşya</b> taşır.
        </div>
        <div>
          <h4>Savaş</h4>
          Birimler otomatik savaşır. Menzil, hex mesafesi ve hedefleme otomatiktir.
          Yeterli manaya ulaşan birim yeteneğini kullanır. Savaşı <b>geçmek</b> için sağ üstteki butonu kullan.
        </div>
        <div>
          <h4>Kısayollar</h4>
          <span class="help-key">D</span> Yenile · <span class="help-key">F</span> XP · <span class="help-key">R</span> Hazır · <span class="help-key">E</span> Seçili birimi sat · <span class="help-key">Esc</span> Seçimi bırak · <span class="help-key">1-5</span> Mağaza satın al
        </div>
      </div>
      <div class="modal-actions"><button class="btn" id="btn-help-close">KAPAT</button></div>
    `);
    const b = $('#btn-help-close');
    if (b) b.addEventListener('click', hideModal);
  }

  /* ================= SONUÇ ================= */
  function showNextOpponent(bot) {
    const banner = $('#opponent-banner');
    if (!banner) return;
    if (S.phase !== 'planning') return;
    banner.classList.remove('hidden');
    banner.innerHTML = `Sıradaki rakip: <b>${bot.icon} ${bot.name}</b> · Sv. ${bot.level} · ${bot.hp} can`;
    banner.style.borderColor = '#3d4f6b'; banner.style.color = '#a9c0dd';
  }
  function hideNextOpponent() {
    const banner = $('#opponent-banner');
    if (banner && S.phase !== 'combat') banner.classList.add('hidden');
  }

  /* Rakip keşfi (scouting) */
  function showScout(bot) {
    if (!bot || !bot.board || !bot.board.length) { toast('Bu oyuncunun tahtası yok', 'bad'); return; }
    const cells = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
      const u = bot.board.find(x => x.r === r && x.c === c);
      if (u) {
        const ch = CH[u.champId];
        cells.push(`<div style="display:flex;align-items:center;gap:4px;background:#16233a;border:1px solid #2b3f5e;border-radius:6px;padding:3px 4px">
          <span style="font-size:15px">${ch.icon}</span>
          <span style="font-size:9px;color:#dbe4f3">${ch.name}</span>
          <span style="font-size:8px;color:#ffd166">${'★'.repeat(u.star)}</span>
        </div>`);
      } else {
        cells.push(`<div style="background:#0d1626;border:1px dashed #1c2942;border-radius:6px;height:24px"></div>`);
      }
    }
    const traits = {};
    bot.board.forEach(u => (CH[u.champId].traits || []).forEach(t => traits[t] = (traits[t] || 0) + 1));
    const trHtml = Object.keys(traits).sort((a, b) => traits[b] - traits[a]).map(t => {
      const def = DATA.TRAITS[t]; let tier = 0; def.tiers.forEach((tt, i) => { if (traits[t] >= tt.n) tier = i + 1; });
      return `<span style="display:inline-flex;gap:3px;align-items:center;font-size:10px;padding:2px 6px;border-radius:5px;margin:2px;background:${tier ? '#2a2211' : '#121d30'};border:1px solid ${tier ? '#7a5c1e' : '#22314a'};color:${tier ? '#ffd98a' : '#93a7c4'}">${def.icon} ${def.name} <b>${traits[t]}</b></span>`;
    }).join('');
    openModal(`
      <h2>${bot.icon} ${bot.name}</h2>
      <p class="sub">Can: <b>${bot.hp}</b> · Seviye: <b>${bot.level}</b> · Güç: <b>${bot.power}</b></p>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${cells.join('')}</div>
      <div style="margin-top:12px">${trHtml}</div>
      <div class="modal-actions"><button class="btn" id="scout-close">KAPAT</button></div>`);
    const b = $('#scout-close'); if (b) b.addEventListener('click', hideModal);
  }

  function showResult(res) {
    const banner = $('#opponent-banner');
    if (!banner) return;
    banner.classList.remove('hidden');
    const txt = res.win ? '✅ ZAFER' : res.draw ? '⚖️ BERABERE' : '❌ YENİLGİ';
    const dmgDealt = S.combat ? Math.round(S.combat.allyUnits.reduce((a, u) => a + (u.dealtDamage || 0), 0)) : 0;
    banner.innerHTML = `${txt} · ${res.label || ''}` +
      (res.playerDmg ? ` · -${res.playerDmg} can` : '') +
      (dmgDealt ? ` · ${dmgDealt.toLocaleString('tr-TR')} hasar` : '');
    banner.style.borderColor = res.win ? '#2f8f5b' : '#8a2f3c';
    banner.style.color = res.win ? '#b6ffd4' : '#ffb3b3';
    sfx(res.win ? 'win' : 'lose');
    setTimeout(() => { if (S.phase !== 'combat') banner.classList.add('hidden'); }, 2300);
  }

  /* ================= SAVAŞ GÖRÜNÜMÜ ================= */
  function setCombatMode(on) {
    $('#combat-bar').classList.toggle('hidden', !on);
    if (!on) {
      const banner = $('#opponent-banner');
      if (banner) banner.classList.add('hidden');
      combatTokens.clear();
      clearFx();
      combatEndDelay = -1;
      renderBoardUnits();
    } else {
      combatTokens.clear();
      const layer = $('#unit-layer');
      layer.innerHTML = '';
      const banner = $('#opponent-banner');
      if (banner) {
        banner.classList.remove('hidden');
        banner.textContent = '⚔️ ' + (S.opponentLabel || 'Rakip');
        banner.style.borderColor = '#6b2c3c'; banner.style.color = '#ffb3b3';
      }
      combatEndDelay = -1;
    }
    renderAll();
  }

  function combatUnitEl(u) {
    let el = combatTokens.get(u.uid);
    if (el) return el;
    el = makeToken(u, { enemy: u.team === 'enemy', combat: true });
    const p = unitPos(u);
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    $('#unit-layer').appendChild(el);
    combatTokens.set(u.uid, el);
    return el;
  }

  function unitPos(u) {
    if (!u) return { x: 0, y: 0 };
    const a = hexCenter(u.fromR !== undefined ? u.fromR : u.r, u.fromC !== undefined ? u.fromC : u.c);
    const b = hexCenter(u.r, u.c);
    const t = clamp(u.moveT === undefined ? 1 : u.moveT, 0, 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function positionCombatTokens(full) {
    if (!S.combat) return;
    const cb = S.combat;
    if (full) {
      combatTokens.clear();
      const layer = $('#unit-layer');
      if (layer) layer.innerHTML = '';
    }
    cb.allyUnits.concat(cb.enemyUnits).forEach(u => {
      if (!u.alive) {
        const el = combatTokens.get(u.uid);
        if (el && !el.classList.contains('dead')) {
          el.classList.add('dead');
          setTimeout(() => { el.remove(); combatTokens.delete(u.uid); }, 460);
        }
        return;
      }
      const el = combatUnitEl(u);
      const p = unitPos(u);
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
      if (!el._refs) {
        el._refs = {
          hp: el.querySelector('.hp-bar i'),
          sh: el.querySelector('.hp-bar .shield'),
          mp: el.querySelector('.mana-bar i'),
          st: el.querySelector('.unit-stars')
        };
      }
      const R = el._refs;
      el.classList.toggle('stunned', !!u.stunT && u.stunT > 0);
      el.classList.toggle('casting', !!u.casting && u.castT > 0);
      if (R.hp) R.hp.style.width = clamp((u.hp / u.maxHp) * 100, 0, 100) + '%';
      if (R.sh) {
        if (u.shield > 0) { R.sh.style.display = 'block'; R.sh.style.width = clamp((u.shield / u.maxHp) * 100, 0, 100) + '%'; }
        else R.sh.style.display = 'none';
      }
      if (R.mp && u.maxMana) R.mp.style.width = clamp((u.mana / u.maxMana) * 100, 0, 100) + '%';
    });
    const aa = $('#ally-alive'), ea = $('#enemy-alive');
    if (aa) aa.textContent = cb.aliveCount('ally');
    if (ea) ea.textContent = cb.aliveCount('enemy');
  }

  function clearFx() {
    fxEls.forEach(e => e.remove());
    fxEls = [];
    const layer = $('#fx-layer');
    if (layer) layer.innerHTML = '';
  }
  function addFx(el, ttl) {
    $('#fx-layer').appendChild(el);
    fxEls.push(el);
    setTimeout(() => { el.remove(); fxEls = fxEls.filter(x => x !== el); }, ttl || 700);
  }

  function fxText(u, text, cls) {
    const p = unitPos(u);
    const d = document.createElement('div');
    d.className = 'fx-text ' + (cls || 'dmg');
    d.textContent = text;
    d.style.left = (p.x + (Math.random() * 16 - 8)) + 'px';
    d.style.top = (p.y - 14) + 'px';
    addFx(d, 950);
  }
  function fxLine(a, b, cls) {
    const pa = unitPos(a), pb = unitPos(b);
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy);
    const d = document.createElement('div');
    d.className = cls || 'fx-line';
    d.style.left = pa.x + 'px'; d.style.top = pa.y + 'px';
    d.style.width = len + 'px';
    d.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    addFx(d, 300);
  }
  function fxAoe(center, radius, kind) {
    const p = unitPos(center);
    const d = document.createElement('div');
    d.className = 'fx-aoe ' + (kind || '');
    const rad = radius === 0 ? hexW * 0.5 : (hexW * (0.9 + radius * 1.05));
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    d.style.width = rad * 2 + 'px'; d.style.height = rad * 2 + 'px';
    addFx(d, 560);
  }
  function fxSlash(u) {
    const p = unitPos(u);
    const d = document.createElement('div');
    d.className = 'fx-slash';
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    addFx(d, 320);
  }

  function handleEvent(ev) {
    if (!S.combat) return;
    switch (ev.type) {
      case 'attack':
        if (Math.random() < 0.7) {
          if (ev.ranged) fxLine(ev.from, ev.to, 'fx-line');
          else { fxSlash(ev.to); }
        }
        break;
      case 'damage': {
        const t = ev.amount;
        if (t >= 1) {
          const crit = ev.crit;
          fxText(ev.unit, (crit ? '💥' : '') + Math.round(t), crit ? 'crit' : ev.dmgType === 'magic' ? 'magic' : ev.dmgType === 'true' ? 'true' : 'dmg');
        }
        break;
      }
      case 'heal': if (ev.amount >= 1) fxText(ev.unit, '+' + Math.round(ev.amount), 'heal'); break;
      case 'shield': fxText(ev.unit, '🛡+' + Math.round(ev.amount), 'heal'); break;
      case 'aoe': fxAoe(ev.center, ev.radius || 1, ev.kind); break;
      case 'cast': fxAoe(ev.unit, 0.35, 'magic'); break;
      case 'chain': case 'statikk': case 'runaan': fxLine(ev.from, ev.to, 'fx-bolt'); break;
      case 'blade': fxSlash(ev.from || ev.unit); break;
      case 'silver': if (ev.to) fxText(ev.to, '💀', 'true'); break;
      case 'dodge': fxText(ev.unit, 'KAÇTI', 'heal'); break;
      case 'stun': fxText(ev.unit, '💫', 'magic'); break;
      case 'stealth': fxText(ev.unit, '🌙', 'magic'); break;
      case 'redemption': fxAoe(ev.unit, 1.3, 'heal'); break;
      case 'death': fxText(ev.unit, '☠', 'dmg'); break;
      default: break;
    }
  }

  function updateCombat(dt) {
    const cb = S.combat;
    if (!cb) return;
    if (!cb.over) {
      let total = dt * (S.speed || 1);
      let guard = 0;
      while (total > 0 && guard < 10) {
        const step = Math.min(0.05, total);
        cb.update(step);
        total -= step; guard++;
      }
      cb.drainEvents().forEach(handleEvent);
      positionCombatTokens();
      renderTimer();
    } else {
      cb.drainEvents().forEach(handleEvent);
      positionCombatTokens();
      if (combatEndDelay < 0) combatEndDelay = 0.7;
      combatEndDelay -= dt;
      if (combatEndDelay <= 0) {
        combatEndDelay = -1;
        if (S.phase === 'combat') G.combatDone();
      }
    }
  }

  function skipCombat() {
    const cb = S.combat;
    if (!cb) return;
    let guard = 0;
    while (!cb.over && guard < 4000) { cb.update(0.05); cb.drainEvents(); guard++; }
    cb.drainEvents();
    positionCombatTokens();
    if (S.phase === 'combat') G.combatDone();
  }

  /* ================= SÜRÜKLE-BIRAK ================= */
  let drag = null;

  function startDrag(e, data) {
    drag = Object.assign({
      startX: e.clientX, startY: e.clientY, moved: false,
      ghost: null, el: null
    }, data);
  }

  function beginGhost() {
    drag.moved = true;
    document.body.classList.add('dragging-unit');
    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost';
    if (drag.kind === 'unit') {
      const u = G.unitByUid(drag.uid);
      const ch = champOf(u);
      ghost.innerHTML = `<div class="unit-token c${ch.cost || 1}" style="position:static;width:${hexW * 0.94}px;height:${hexW * 0.94}px;transform:none">
        <div class="unit-inner"><div class="unit-ring"></div><div class="unit-portrait">${ch.icon}</div>
        <div class="unit-stars">${'★'.repeat(u.star || 1)}</div></div></div>`;
    } else {
      const it = S.items[drag.itemSlot];
      ghost.innerHTML = `<div style="font-size:${Math.round(hexW * 0.5)}px;filter:drop-shadow(0 4px 8px #000)">${it.icon}</div>`;
    }
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    if (drag.el) drag.el.classList.add('dragging');
  }

  function moveGhost(x, y) {
    if (!drag || !drag.ghost) return;
    drag.ghost.style.left = x + 'px';
    drag.ghost.style.top = y + 'px';
    // hex hover
    $$('.hex.hover, .hex.invalid, .bench-slot.hover, .item-slot.hover').forEach(el => el.classList.remove('hover', 'invalid'));
    const under = document.elementFromPoint(x, y);
    if (!under) return;
    const overToken = under.closest('.unit-token');
    if (overToken && drag.kind === 'unit' && +overToken.dataset.uid !== drag.uid) {
      const tu = G.unitByUid(+overToken.dataset.uid);
      if (tu && tu.r >= 0) { $$('.hex.hover').forEach(el => el.classList.remove('hover')); }
    }
    const hex = under.closest('.hex');
    if (hex) {
      const r = +hex.dataset.r;
      if (drag.kind === 'unit') hex.classList.add(r >= 4 ? 'hover' : 'invalid');
      else hex.classList.add('hover');
    }
    const bs = under.closest('.bench-slot');
    if (bs && drag.kind === 'unit') bs.classList.add('hover');
    const is = under.closest('.item-slot');
    if (is && drag.kind === 'item' && is !== drag.el) is.classList.add('hover');
    const sell = under.closest('#sell-zone');
    if (sell) sell.classList.add('hot');
  }

  function endDrag(e) {
    if (!drag) return;
    const x = e.clientX, y = e.clientY;
    const ghost = drag.ghost;
    if (ghost) ghost.remove();
    document.body.classList.remove('dragging-unit');
    if (drag.el) drag.el.classList.remove('dragging');
    $$('.hex.hover,.hex.invalid,.bench-slot.hover,.item-slot.hover').forEach(el => el.classList.remove('hover', 'invalid'));
    const d = drag; drag = null;
    if (!d.moved) return;
    const under = document.elementFromPoint(x, y);
    if (!under) return;
    if (d.kind === 'unit') {
      if (under.closest('#sell-zone') || under.closest('.shop-block') || under.closest('#shop')) { G.sellUnit(d.uid); return; }
      const targetToken = under.closest('.unit-token');
      if (targetToken && +targetToken.dataset.uid !== d.uid) {
        const tu = G.unitByUid(+targetToken.dataset.uid);
        if (tu) {
          if (tu.r >= 0) { G.placeUnit(d.uid, tu.r, tu.c); return; }
          const bi = S.bench.findIndex(b => b && b.uid === tu.uid);
          if (bi >= 0) { G.benchUnit(d.uid, bi); return; }
        }
      }
      const hex = under.closest('.hex');
      if (hex) { G.placeUnit(d.uid, +hex.dataset.r, +hex.dataset.c); return; }
      const bs = under.closest('.bench-slot');
      if (bs) { G.benchUnit(d.uid, +bs.dataset.bench); return; }
    } else if (d.kind === 'item') {
      const unitEl = under.closest('.unit-token');
      if (unitEl) { G.equipItem(+unitEl.dataset.uid, d.itemSlot); return; }
      const is = under.closest('.item-slot');
      if (is) {
        const to = +is.dataset.item;
        if (to !== d.itemSlot) {
          const A = S.items[d.itemSlot], B = S.items[to];
          if (A && B) {
            if (A.comp && B.comp) G.combineItems(d.itemSlot, to);
            else { G.toast('Sadece iki bileşen birleşir', 'bad'); }
          } else if (A) G.moveItemToSlot(d.itemSlot, to);
        }
        return;
      }
    }
  }

  function bindPointer() {
    document.addEventListener('pointerdown', e => {
      if (S.phase === 'gameover') return;
      const unitEl = e.target.closest('.unit-token');
      const itemEl = e.target.closest('.item-slot');
      if (unitEl && !unitEl.classList.contains('enemy-token') && S.phase !== 'combat') {
        const uid = +unitEl.dataset.uid;
        const u = G.unitByUid(uid);
        if (!u) return;
        startDrag(e, { kind: 'unit', uid, el: unitEl });
        S.selectedUid = uid;
        renderInfo();
        e.preventDefault();
      } else if (itemEl && S.items[+itemEl.dataset.item] && S.phase === 'planning') {
        startDrag(e, { kind: 'item', itemSlot: +itemEl.dataset.item, el: itemEl });
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('pointermove', e => {
      if (!drag) return;
      if (!drag.moved) {
        const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
        if (dist < 6) return;
        beginGhost();
      }
      moveGhost(e.clientX, e.clientY);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('pointerup', e => {
      if (drag) { endDrag(e); e.preventDefault(); }
    });
    document.addEventListener('pointercancel', () => {
      if (drag) {
        if (drag.ghost) drag.ghost.remove();
        document.body.classList.remove('dragging-unit');
        $$('.hex.hover,.hex.invalid,.bench-slot.hover,.item-slot.hover').forEach(el => el.classList.remove('hover', 'invalid'));
        drag = null;
      }
    });
  }

  function bindClicks() {
    document.addEventListener('click', e => {
      const shopCard = e.target.closest('.shop-card');
      if (shopCard && shopCard.dataset.shop !== undefined && S.phase === 'planning') {
        G.buyUnit(+shopCard.dataset.shop); return;
      }
      const sellBtn = e.target.closest('[data-sell]');
      if (sellBtn) { G.sellUnit(+sellBtn.dataset.sell); return; }
      const itemEl = e.target.closest('.item-slot.filled');
      if (itemEl && S.items[+itemEl.dataset.item]) {
        const it = S.items[+itemEl.dataset.item];
        showItemTooltip(it, e.clientX, e.clientY);
        setTimeout(hideTooltip, 2200);
      }
      const traitRow = e.target.closest('.trait-row');
      if (traitRow) { showTraitDetail(traitRow.dataset.trait); return; }
      const chip = e.target.closest('.player-chip');
      if (chip && chip.dataset.player && chip.dataset.player !== 'me') {
        const bot = S.bots.find(b => b.id === chip.dataset.player);
        if (bot) showScout(bot);
        return;
      }
      if (chip && chip.dataset.player === 'me') { toast('Bu senin tahtan!', 'bad'); return; }

    });

    // hover tooltipleri
    document.addEventListener('mouseover', e => {
      const unitEl = e.target.closest('.unit-token');
      if (unitEl) {
        if (S.phase === 'combat' && S.combat) {
          const uid = +unitEl.dataset.uid;
          const u = S.combat.allyUnits.concat(S.combat.enemyUnits).find(x => x.uid === uid);
          if (u) showUnitTooltip(u, e.clientX, e.clientY, u.team === 'enemy');
          return;
        }
        const u = G.unitByUid(+unitEl.dataset.uid);
        if (u) showUnitTooltip(u, e.clientX, e.clientY);
        return;
      }
      const shopCard = e.target.closest('.shop-card');
      if (shopCard && shopCard.dataset.shop !== undefined && S.shop[+shopCard.dataset.shop]) {
        showChampTooltip(CH[S.shop[+shopCard.dataset.shop]], e.clientX, e.clientY); return;
      }
      const itemEl = e.target.closest('.item-slot.filled');
      if (itemEl && S.items[+itemEl.dataset.item]) {
        showItemTooltip(S.items[+itemEl.dataset.item], e.clientX, e.clientY); return;
      }
      const traitRow = e.target.closest('.trait-row');
      if (traitRow) { showTraitTooltip(traitRow.dataset.trait, e.clientX, e.clientY); return; }
      const tm = e.target.closest('.tm-chip');
      if (tm) { showTraitTooltip(tm.dataset.trait, e.clientX, e.clientY); return; }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('.unit-token') || e.target.closest('.shop-card') || e.target.closest('.item-slot') || e.target.closest('.trait-row') || e.target.closest('.tm-chip')) hideTooltip();
    });
  }

  function bindButtons() {
    const on = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('click', fn); };
    on('#btn-reroll', () => { if (S.phase === 'planning') G.rollShop(false); });
    on('#btn-xp', () => { if (S.phase === 'planning') G.buyXp(); });
    on('#shop-lock', () => G.toggleLock());
    on('#btn-ready', () => { if (S.phase === 'planning' || S.phase === 'carousel') G.startCombat(); });
    on('#btn-arrange', () => { if (S.phase === 'planning') G.autoArrange(); });
    on('#btn-skip', () => skipCombat());
    on('#btn-speed', () => {
      S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1;
      $('#btn-speed').textContent = S.speed + 'x';
    });
    on('#btn-sound', () => {
      soundOn = !soundOn;
      $('#btn-sound').textContent = soundOn ? '🔊' : '🔇';
    });
    on('#btn-help', () => showHelp());

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'd') { if (S.phase === 'planning') G.rollShop(false); }
      else if (k === 'f') { if (S.phase === 'planning') G.buyXp(); }
      else if (k === 'r') { if (S.phase === 'planning' || S.phase === 'carousel') G.startCombat(); }
      else if (k === 'e') { if (S.selectedUid) G.sellUnit(S.selectedUid); }
      else if (k === 'escape') { S.selectedUid = null; renderInfo(); hideTooltip(); }
      else if (k >= '1' && k <= '5') { if (S.phase === 'planning') G.buyUnit(+k - 1); }
      else if (k === ' ') { if (S.phase === 'planning') G.startCombat(); }
    });
  }

  /* ================= RENDER ALL ================= */
  function renderAll() {
    if (!S) return;
    renderTopbar();
    renderBars();
    renderShop();
    renderBench();
    renderItems();
    renderTraits();
    renderInfo();
    if (S.phase !== 'combat') renderBoardUnits();
    renderTimer();
  }

  /* ================= ANA DÖNGÜ ================= */
  let lastT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!lastT) lastT = now;
    let dt = (now - lastT) / 1000;
    lastT = now;
    dt = Math.min(0.06, Math.max(0, dt));
    if (!S) return;
    if (S.phase === 'combat' && S.combat) updateCombat(dt);
    G.tick(dt);
    if (S.phase === 'planning' || S.phase === 'carousel') {
      const ct = $('#carousel-timer');
      if (ct) ct.textContent = Math.ceil(S.timer);
    }
  }

  /* ================= INIT ================= */
  function init() {
    G = TFT.Game; S = G.S;
    layout();
    const sz = document.createElement('div');
    sz.id = 'sell-zone';
    sz.innerHTML = '🗑️<br>SAT';
    sz.style.cssText = 'position:fixed;right:20px;bottom:80px;z-index:700;display:none;background:#2a0f14;border:1px dashed #a23a48;border-radius:10px;padding:10px 16px;font-size:11px;color:#ffb3b3;text-align:center;font-weight:800;letter-spacing:1px';
    document.body.appendChild(sz);
    bindPointer();
    bindClicks();
    bindButtons();
    window.addEventListener('resize', () => { layout(); });
    window.addEventListener('load', () => { layout(); });
    setTimeout(layout, 250);
    document.addEventListener('dragstart', e => e.preventDefault());
    if (document.body.classList.contains('dragging-unit')) { }
    // dragging sınıfını sell-zone için izle
    const obs = new MutationObserver(() => {
      sz.style.display = document.body.classList.contains('dragging-unit') ? 'block' : 'none';
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    requestAnimationFrame(loop);
  }

  TFT.UI = {
    init, renderAll, renderBoardUnits, renderBench, renderShop, renderItems,
    renderTraits, renderTraitsMini: renderTraits, renderInfo, renderPlayers,
    renderBars, renderTimer, renderTopbar, renderLog,
    setCombatMode, showResult, showCarousel, showScout, showNextOpponent, hideNextOpponent, showAugments, showGameOver, showHelp,
    toast, sfx, hideModal, layout, showTraitDetail,
    showUnitTooltip, showChampTooltip, showItemTooltip, showTraitTooltip, showTooltip, hideTooltip,
    skipCombat, updateCombat, positionCombatTokens
  };
})();
