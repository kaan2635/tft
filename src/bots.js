/* =====================================================================
   TFT ARENA — OFFLINE  |  bots.js
   7 bot oyuncu: komp kurma, seviye alma, yıldız yükseltme, eşya takma
   ===================================================================== */
window.TFT = window.TFT || {};
(function () {
  'use strict';
  const TFT = window.TFT;
  const DATA = TFT.DATA;
  const CH = DATA.CHAMP_BY_ID;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random;
  const choose = a => a[Math.floor(rnd() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function champsWithTrait(t) {
    return DATA.CHAMPS.filter(c => c.traits.includes(t));
  }

  function makeBot(i) {
    const nm = DATA.BOT_NAMES[i % DATA.BOT_NAMES.length];
    // taşıyıcı seç → komp sinerjileri
    const carries = DATA.CHAMPS.filter(c => c.cost >= 3);
    const carry = choose(carries);
    const traits = carry.traits.slice();
    return {
      id: 'bot' + i, name: nm.name, icon: nm.icon,
      hp: 100, level: 2, alive: true, place: 0, streak: 0, streakType: 0,
      carry: carry.id, traits,
      board: [], power: 0, seed: Math.random()
    };
  }

  function botLevelFor(bot, stage, round) {
    const base = [0, 3, 4, 5, 6, 7, 8, 8, 9][Math.min(8, stage)] || 9;
    const variance = bot.seed > 0.75 ? 1 : bot.seed < 0.2 ? -1 : 0;
    const rBonus = round >= 5 ? 1 : 0;
    return clamp(base + variance + rBonus, 1, 9);
  }

  function rollCost(level) {
    const odds = DATA.SHOP_ODDS[clamp(level, 1, 9)];
    let r = rnd() * 100, acc = 0;
    for (let i = 0; i < 5; i++) { acc += odds[i]; if (r < acc) return i + 1; }
    return 5;
  }

  /* Bot kompunu kurar (yıldız, eşya, pozisyon) */
  function buildBoard(bot, stage, round) {
    const level = botLevelFor(bot, stage, round);
    bot.level = level;
    const size = clamp(level + (bot.seed > 0.85 ? 1 : 0), 1, 9);
    const traitPool = [];
    bot.traits.forEach(t => { champsWithTrait(t).forEach(c => { if (!traitPool.includes(c.id)) traitPool.push(c.id); }); });

    const picked = [];
    const used = new Set();
    // 1) komp birimleri
    let guard = 0;
    while (picked.length < size && guard < 200) {
      guard++;
      const wantCost = rollCost(level);
      let cands = traitPool.map(id => CH[id]).filter(c => !used.has(c.id) && c.cost <= Math.max(2, Math.min(5, wantCost + 1)));
      if (!cands.length) cands = traitPool.map(id => CH[id]).filter(c => !used.has(c.id));
      if (!cands.length) break;
      // aynı maliyete yakın olanları önceliklendir
      cands.sort((a, b) => Math.abs(a.cost - wantCost) - Math.abs(b.cost - wantCost) + (rnd() - 0.5) * 0.8);
      const c = cands[0];
      used.add(c.id); picked.push(c);
    }
    // 2) eksikse herhangi bir şampiyonla doldur
    guard = 0;
    while (picked.length < size && guard < 60) {
      guard++;
      const c = choose(DATA.CHAMPS);
      if (used.has(c.id)) continue;
      used.add(c.id); picked.push(c);
    }

    // yıldızlar
    const p2 = clamp(0.06 + stage * 0.13 + round * 0.015, 0, 0.9);
    const p3 = stage >= 5 ? clamp((stage - 4) * 0.10, 0, 0.3) : 0;
    const itemsMax = clamp(Math.floor(stage / 1.7), 0, 3);

    const units = picked.map(c => {
      let star = 1;
      if (rnd() < p3) star = 3; else if (rnd() < p2) star = 2;
      const items = [];
      const n = Math.min(DATA.MAX_ITEMS_PER_UNIT, Math.floor(rnd() * (itemsMax + 1)));
      for (let k = 0; k < n; k++) items.push(randomItem(stage));
      return { champId: c.id, star, items, r: 0, c: 0 };
    });

    // pozisyon: melee öne, ranged arkaya
    const slots = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) slots.push({ r, c });
    const front = slots.filter(s => s.r >= 2).sort((a, b) => b.r - a.r || a.c - b.c);
    const back = slots.filter(s => s.r <= 1);
    const melee = units.filter(u => CH[u.champId].range <= 1);
    const ranged = units.filter(u => CH[u.champId].range > 1);
    const taken = new Set();
    const put = (u, pool) => {
      let s = null, bi = 0, bs = 1e9;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (taken.has(p.r + ',' + p.c)) continue;
        // merkeze yakınlık tercihi
        const d = Math.abs(p.c - 3) + Math.abs(p.r - 2) * 0.6 + rnd() * 1.5;
        if (d < bs) { bs = d; s = p; bi = i; }
      }
      if (!s) s = { r: 1, c: 3 };
      taken.add(s.r + ',' + s.c);
      u.r = s.r; u.c = s.c;
    };
    melee.forEach(u => put(u, front));
    ranged.forEach(u => put(u, back));

    bot.board = units;
    bot.power = boardPower(units);
    return units;
  }

  function randomItem(stage) {
    if (stage >= 3 && rnd() < 0.55) {
      const k = choose(Object.keys(DATA.COMBINED));
      const p = k.split('+');
      return DATA.buildItem(p[0], p[1]);
    }
    const comp = DATA.COMPONENTS[choose(DATA.COMP_KEYS)];
    return { id: comp.id, name: comp.name, icon: comp.icon, stats: comp.stats, comp: true, desc: comp.desc };
  }

  function boardPower(units) {
    if (!units || !units.length) return 0;
    let p = 0;
    const traitCount = {};
    units.forEach(u => {
      const ch = CH[u.champId]; if (!ch) return;
      const hp = ch.hp * DATA.STAR_MULT.hp[u.star - 1];
      const ad = ch.ad * DATA.STAR_MULT.ad[u.star - 1];
      const itemBonus = 1 + (u.items ? u.items.length : 0) * 0.14;
      p += (hp * 0.32 + ad * 3.4 + ch.cost * 12) * itemBonus * (1 + (u.star - 1) * 0.06);
      ch.traits.forEach(t => { traitCount[t] = (traitCount[t] || 0) + 1; });
    });
    Object.keys(traitCount).forEach(t => {
      const def = DATA.TRAITS[t]; if (!def) return;
      let tier = 0; def.tiers.forEach((tt, i) => { if (traitCount[t] >= tt.n) tier = i + 1; });
      p += tier * 55;
    });
    return Math.round(p);
  }

  /* Bot vs bot sonucu (soyut) */
  function fightBots(a, b) {
    const pa = a.power * (0.86 + rnd() * 0.28);
    const pb = b.power * (0.86 + rnd() * 0.28);
    if (Math.abs(pa - pb) < Math.max(pa, pb) * 0.04) return 'draw';
    return pa > pb ? 'a' : 'b';
  }

  /* PvE dalga spec üretimi */
  function pveSpecs(stage, waveKey) {
    const w = DATA.PVE_WAVES[clamp(waveKey, 1, 6)];
    const def = DATA.CREEP_DEFS[w.units];
    let mult = 1 + (stage - 1) * 0.42 + Math.max(0, stage - 6) * 0.5;
    if (stage === 1) mult = 0.62;
    const specs = [];
    const spots = [
      { r: 3, c: 3 }, { r: 3, c: 2 }, { r: 3, c: 4 }, { r: 2, c: 1 }, { r: 2, c: 5 },
      { r: 3, c: 1 }, { r: 3, c: 5 }, { r: 2, c: 3 }, { r: 1, c: 3 }
    ];
    for (let i = 0; i < def.count; i++) {
      const s = spots[i % spots.length];
      specs.push({ creep: w.units, r: s.r, c: s.c, hpMult: mult, adMult: stage === 1 ? 0.7 : 1 + (stage - 1) * 0.30 });
    }
    return { specs, wave: w, mult };
  }

  TFT.Bots = { makeBot, buildBoard, boardPower, fightBots, pveSpecs, botLevelFor, randomItem };
})();
