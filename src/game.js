/* =====================================================================
   TFT ARENA — OFFLINE  |  game.js
   Oyun durumu, ekonomi, mağaza, tur akışı, carousel, augmentlar, botlar
   ===================================================================== */
window.TFT = window.TFT || {};
(function () {
  'use strict';
  const TFT = window.TFT;
  const DATA = TFT.DATA;
  const CH = DATA.CHAMP_BY_ID;
  const Bots = TFT.Bots;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random;
  const choose = a => a[Math.floor(rnd() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let UID = 1;
  const S = {};

  function reset() {
    Object.assign(S, {
      stage: 1, round: 1, phase: 'idle', roundType: 'pvp',
      hp: 100, gold: 4, level: 2, xp: 0, streak: 0,
      shop: [null, null, null, null, null], shopLocked: false,
      bench: new Array(DATA.BENCH_SIZE).fill(null),
      board: [],
      items: new Array(DATA.ITEM_BENCH_SIZE).fill(null),
      augments: [], buffs: {},
      bots: [], pool: {},
      timer: 0, timerMax: 30,
      combat: null, opponentId: null,
      selectedUid: null,
      carousel: null, carouselTimer: 0,
      augmentOptions: null,
      result: null, resultTimer: 0,
      alive: true, place: 0,
      stats: { rounds: 0, wins: 0, losses: 0, damage: 0, goldEarned: 0, unitsBought: 0, maxStreak: 0, startTime: Date.now() },
      log: [],
      pveReward: null,
      speed: 1,
      skipRequested: false,
      lastOpponent: null
    });
    UID = 1;
    Object.keys(shownTips).forEach(k => delete shownTips[k]);
    DATA.CHAMPS.forEach(c => { S.pool[c.id] = DATA.POOL_COUNT[c.cost]; });
    S.bots = [];
    for (let i = 0; i < 7; i++) S.bots.push(Bots.makeBot(i));
    S.bench = new Array(DATA.BENCH_SIZE).fill(null);
    S.items = new Array(DATA.ITEM_BENCH_SIZE).fill(null);
  }

  /* ================= YARDIMCILAR ================= */
  const ROLE_MELEE = c => c.range <= 1;

  function roundsInStage(stage) { return stage === 1 ? 4 : 7; }
  function roundPlan(stage, round) {
    if (stage === 1) return ['carousel', 'pve', 'pve', 'pve'][round - 1] || 'pve';
    if (round === 4) return 'carousel';
    if (round === 7) return 'pve';
    return 'pvp';
  }
  // carousel turlarında da savaş olur; 1-1 PvE'dir
  function combatType() {
    if (S.roundType === 'pve') return 'pve';
    if (S.roundType === 'carousel' && S.stage === 1 && S.round === 1) return 'pve';
    if (S.roundType === 'carousel') return 'pvp';
    return 'pvp';
  }
  function roundKey() { return S.stage + '-' + S.round; }
  function isAugmentRound() { return ['2-1', '3-2', '4-2', '5-2'].includes(roundKey()); }

  function allUnits() { return S.board.concat(S.bench.filter(Boolean)); }
  function unitByUid(uid) { return allUnits().find(u => u.uid === +uid); }
  function boardCount() { return S.board.length; }
  function teamSize() { return clamp(S.level + (S.buffs.teamSize || 0), 1, 12); }
  function benchFree() { return S.bench.some(b => !b); }
  function itemFree() { return S.items.some(i => !i); }
  function hasTraitActive(t, n) {
    const counts = traitCounts();
    const def = DATA.TRAITS[t]; if (!def) return false;
    return (counts[t] || 0) >= (n || def.tiers[0].n);
  }
  function traitCounts() {
    const counts = {};
    const seen = new Set();
    S.board.forEach(u => {
      if (seen.has(u.champId)) return;
      seen.add(u.champId);
      const c = CH[u.champId]; if (!c) return;
      c.traits.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
    return counts;
  }
  function activeTraits() {
    const counts = traitCounts(); const out = [];
    Object.keys(counts).forEach(t => {
      const def = DATA.TRAITS[t]; if (!def) return;
      let tier = 0; def.tiers.forEach((tt, i) => { if (counts[t] >= tt.n) tier = i + 1; });
      out.push({ id: t, count: counts[t], tier, def });
    });
    out.sort((a, b) => (b.tier - a.tier) || (b.count - a.count));
    return out;
  }
  function unitAt(r, c) { return S.board.find(u => u.r === r && u.c === c); }

  function makeUnit(champId, star, items) {
    return {
      uid: UID++, champId, star: star || 1,
      items: (items || []).slice(0, DATA.MAX_ITEMS_PER_UNIT),
      r: -1, c: -1
    };
  }
  function mergeCopies(champId, star) {
    const list = allUnits().filter(u => u.champId === champId && u.star === star);
    if (list.length < 3) return null;
    list.sort((a, b) => b.items.length - a.items.length || (a.r >= 0 ? -1 : 1));
    const keep = list[0], a = list[1], b = list[2];
    const items = keep.items.concat(a.items, b.items).slice(0, DATA.MAX_ITEMS_PER_UNIT);
    removeUnit(a.uid); removeUnit(b.uid);
    keep.star = star + 1;
    keep.items = items;
    if (S.selectedUid === a.uid || S.selectedUid === b.uid) S.selectedUid = keep.uid;
    pushLog(`⭐ ${CH[champId].name} ${star + 1} yıldıza yükseldi!`);
    TFT.UI && TFT.UI.toast(`${CH[champId].name} → ${star + 1}★`, 'good');
    TFT.UI && TFT.UI.sfx('star');
    return keep;
  }
  function mergeAll(champId) {
    let changed = true;
    while (changed) {
      changed = false;
      if (mergeCopies(champId, 1)) changed = true;
      if (mergeCopies(champId, 2)) changed = true;
    }
  }
  function addUnitToBench(champId, star, items) {
    const slot = S.bench.findIndex(b => !b);
    if (slot < 0) return null;
    const u = makeUnit(champId, star, items);
    S.bench[slot] = u;
    mergeAll(champId);
    return u;
  }
  function removeUnit(uid) {
    const bi = S.bench.findIndex(u => u && u.uid === uid);
    if (bi >= 0) { S.bench[bi] = null; return; }
    const ii = S.board.findIndex(u => u.uid === uid);
    if (ii >= 0) S.board.splice(ii, 1);
  }

  function sellPrice(u) {
    const c = CH[u.champId].cost;
    if (u.star === 1) return c;
    if (u.star === 2) return c * 3 - 1;
    return c * 9 - 2;
  }

  const shownTips = {};
  function tip(key, msg) {
    if (shownTips[key]) return;
    shownTips[key] = true;
    setTimeout(() => TFT.UI && TFT.UI.toast('💡 ' + msg), 400);
  }

  function pushLog(msg) {
    S.log.unshift({ t: Date.now(), msg });
    if (S.log.length > 60) S.log.pop();
    TFT.UI && TFT.UI.renderLog();
  }

  /* ================= EKONOMİ ================= */
  function addGold(n) {
    S.gold = Math.max(0, S.gold + n);
    if (n > 0) S.stats.goldEarned += n;
    TFT.UI && TFT.UI.renderBars();
  }
  function addXp(n) {
    if (S.level >= DATA.MAX_LEVEL) { S.xp = 0; return; }
    S.xp += n;
    let needed = DATA.XP_TABLE[S.level] || 999;
    while (S.level < DATA.MAX_LEVEL && S.xp >= needed) {
      S.xp -= needed;
      S.level++;
      needed = DATA.XP_TABLE[S.level] || 999;
      TFT.UI && TFT.UI.toast(`Seviye ${S.level}!`, 'good');
      TFT.UI && TFT.UI.sfx('level');
      pushLog(`⬆ Seviye ${S.level}`);
    }
    if (S.level >= DATA.MAX_LEVEL) S.xp = 0;
    TFT.UI && TFT.UI.renderBars();
  }
  function healPlayer(n) {
    S.hp = Math.min(100, S.hp + n);
    TFT.UI && TFT.UI.renderPlayers();
  }
  function addGlobalBuff(key, val) {
    S.buffs[key] = (S.buffs[key] || 0) + val;
    TFT.UI && TFT.UI.renderBars();
  }
  function giveRandomComponent() {
    const comp = DATA.COMPONENTS[choose(DATA.COMP_KEYS)];
    addItem({ id: comp.id, name: comp.name, icon: comp.icon, stats: comp.stats, comp: true, desc: comp.desc });
  }
  function giveRandomCompletedItem() {
    const k = choose(Object.keys(DATA.COMBINED));
    const p = k.split('+');
    addItem(DATA.buildItem(p[0], p[1]));
  }
  function addItem(it) {
    const i = S.items.findIndex(x => !x);
    if (i < 0) { pushLog('Eşya alanı dolu!'); return false; }
    S.items[i] = it;
    TFT.UI && TFT.UI.renderItems();
    return true;
  }

  /* ================= MAĞAZA ================= */
  function shopOdds() {
    const lvl = clamp(S.level + (S.buffs.shopOdds || 0), 1, 9);
    return DATA.SHOP_ODDS[lvl];
  }
  function rollShop(free) {
    const cost = free ? 0 : Math.max(0, DATA.REROLL_COST - (S.buffs.rerollDiscount || 0));
    if (!free) {
      if (S.gold < cost) { TFT.UI && TFT.UI.toast('Yeterli altın yok', 'bad'); return; }
      S.gold -= cost;
      TFT.UI && TFT.UI.sfx('roll');
    }
    const odds = shopOdds();
    S.shop = [];
    for (let i = 0; i < 5; i++) {
      const tier = pickTier(odds);
      const champ = pickChampOfTier(tier);
      S.shop.push(champ ? champ.id : null);
    }
    TFT.UI && TFT.UI.renderShop();
    TFT.UI && TFT.UI.renderBars();
  }
  function pickTier(odds) {
    let r = rnd() * 100, acc = 0;
    for (let i = 0; i < 5; i++) { acc += odds[i]; if (r < acc) return i + 1; }
    return 5;
  }
  function pickChampOfTier(tier) {
    const pool = DATA.CHAMPS.filter(c => c.cost === tier && S.pool[c.id] > 0);
    if (!pool.length) {
      // bu maliyet tükendi → yakın maliyet
      for (let d = 1; d <= 4; d++) {
        const alt = DATA.CHAMPS.filter(c => Math.abs(c.cost - tier) === d && S.pool[c.id] > 0);
        if (alt.length) return choose(alt);
      }
      return null;
    }
    return choose(pool);
  }

  function buyUnit(shopIdx) {
    const id = S.shop[shopIdx];
    if (!id) return;
    const champ = CH[id];
    if (S.gold < champ.cost) { TFT.UI && TFT.UI.toast('Yeterli altın yok', 'bad'); return; }
    if (S.pool[id] <= 0) { TFT.UI && TFT.UI.toast('Stokta kalmadı', 'bad'); return; }
    const hasSpace = benchFree();
    const twoCopies = allUnits().filter(u => u.champId === id && u.star === 1).length >= 2;
    if (!hasSpace && !twoCopies) { TFT.UI && TFT.UI.toast('Yedek alanı dolu', 'bad'); return; }
    S.gold -= champ.cost;
    S.pool[id]--;
    S.shop[shopIdx] = null;
    S.stats.unitsBought++;
    if (hasSpace) {
      addUnitToBench(id, 1, []);
    } else {
      // yedek dolu ama 3. kopya → doğrudan birleştir
      const keep = mergeCopies(id, 1);
      if (!keep) { addGold(champ.cost); S.pool[id]++; S.stats.unitsBought--; TFT.UI && TFT.UI.toast('Yedek alanı dolu', 'bad'); return; }
      mergeAll(id);
    }
    TFT.UI && TFT.UI.sfx('buy');
    if (S.stats.unitsBought >= 2) tip('merge', 'Aynı şampiyondan 3 tane alırsan 2★ olur, 3 tane 2★ ise 3★');
    TFT.UI && TFT.UI.renderAll();
  }

  function buyXp() {
    if (S.level >= DATA.MAX_LEVEL) { TFT.UI && TFT.UI.toast('Maksimum seviye', 'bad'); return; }
    if (S.gold < DATA.XP_COST) { TFT.UI && TFT.UI.toast('Yeterli altın yok', 'bad'); return; }
    S.gold -= DATA.XP_COST;
    addXp(DATA.XP_PER_BUY);
    TFT.UI && TFT.UI.sfx('xp');
    TFT.UI && TFT.UI.renderAll();
  }
  function toggleLock() {
    S.shopLocked = !S.shopLocked;
    TFT.UI && TFT.UI.renderShop();
  }

  /* ================= YERLEŞTİRME ================= */
  function placeUnit(uid, r, c) {
    const u = unitByUid(uid); if (!u) return false;
    if (r < 4) { TFT.UI && TFT.UI.toast('Sadece kendi yarınına yerleştirebilirsin', 'bad'); return false; }
    const occ = unitAt(r, c);
    if (occ && occ.uid === u.uid) return false;
    const fromBench = u.r < 0;
    if (fromBench && boardCount() >= teamSize() && !occ) {
      TFT.UI && TFT.UI.toast(`Takım sınırı: ${teamSize()} birim (seviye ${S.level})`, 'bad');
      return false;
    }
    if (occ) {
      // yer değiştir
      if (fromBench) {
        occ.r = -1; occ.c = -1;
        const bi = S.bench.findIndex(b => b && b.uid === u.uid);
        S.bench[bi] = occ;
        S.board.push(u);
      } else {
        const tr = u.r, tc = u.c;
        u.r = r; u.c = c; occ.r = tr; occ.c = tc;
      }
    } else {
      if (fromBench) {
        const bi = S.bench.findIndex(b => b && b.uid === u.uid);
        S.bench[bi] = null;
        S.board.push(u);
      }
      u.r = r; u.c = c;
    }
    TFT.UI && TFT.UI.sfx('place');
    TFT.UI && TFT.UI.renderAll();
    return true;
  }

  function benchUnit(uid, slot) {
    const u = unitByUid(uid); if (!u) return false;
    if (slot < 0 || slot >= DATA.BENCH_SIZE) return false;
    if (S.bench[slot] && S.bench[slot].uid === u.uid) return false;
    const occ = S.bench[slot];
    const fromBoard = u.r >= 0;
    if (fromBoard) {
      const br = u.r, bc = u.c;
      S.board = S.board.filter(x => x.uid !== u.uid);
      u.r = -1; u.c = -1;
      S.bench[slot] = u;
      if (occ) { // yedekteki birim tahtaya geçer
        occ.r = br; occ.c = bc;
        S.board.push(occ);
      }
    } else {
      const bi = S.bench.findIndex(b => b && b.uid === u.uid);
      S.bench[slot] = u;
      if (bi >= 0) S.bench[bi] = occ || null;
    }
    TFT.UI && TFT.UI.sfx('place');
    TFT.UI && TFT.UI.renderAll();
    return true;
  }

  function autoArrange() {
    if (!S.board.length) { TFT.UI && TFT.UI.toast('Tahtada birim yok', 'bad'); return; }
    const units = S.board.slice();
    S.board = [];
    const colOrder = [3, 2, 4, 1, 5, 0, 6];
    const slots = [];
    // melee: 4,5 ; ranged: 7,6
    [4, 5].forEach(r => colOrder.forEach(c => slots.push({ r, c })));
    [7, 6].forEach(r => colOrder.forEach(c => slots.push({ r, c })));
    const melee = units.filter(u => CH[u.champId].range <= 1).sort((a, b) => CH[b.champId].cost - CH[a.champId].cost);
    const ranged = units.filter(u => CH[u.champId].range > 1).sort((a, b) => CH[b.champId].cost - CH[a.champId].cost);
    const ordered = melee.concat(ranged);
    ordered.forEach((u, i) => {
      const s2 = slots[i];
      u.r = s2.r; u.c = s2.c;
      S.board.push(u);
    });
    TFT.UI && TFT.UI.sfx('place');
    TFT.UI && TFT.UI.renderAll();
  }

  function sellUnit(uid) {
    const u = unitByUid(uid); if (!u) return;
    const price = sellPrice(u);
    addGold(price);
    const lost = u.items.filter(it => !addItem(it)).length;
    if (lost) TFT.UI && TFT.UI.toast(`${lost} eşya sığmadı ve kayboldu!`, 'bad');
    if (S.selectedUid === u.uid) S.selectedUid = null;
    removeUnit(u.uid);
    TFT.UI && TFT.UI.toast(`${CH[u.champId].name} satıldı (+${price} altın)`, 'good');
    TFT.UI && TFT.UI.sfx('sell');
    pushLog(`💰 ${CH[u.champId].name} satıldı`);
    TFT.UI && TFT.UI.renderAll();
  }

  /* ================= EŞYA ================= */
  function equipItem(uid, itemSlot) {
    const u = unitByUid(uid), it = S.items[itemSlot];
    if (!u || !it) return false;
    if (u.items.length >= DATA.MAX_ITEMS_PER_UNIT) {
      TFT.UI && TFT.UI.toast('Bir birime en fazla 3 eşya', 'bad'); return false;
    }
    S.items[itemSlot] = null;
    u.items.push(it);
    TFT.UI && TFT.UI.sfx('item');
    TFT.UI && TFT.UI.renderAll();
    return true;
  }
  function combineItems(a, b) {
    const A = S.items[a], B = S.items[b];
    if (!A || !B || !A.comp || !B.comp) return false;
    const made = DATA.buildItem(A.id, B.id);
    if (!made) return false;
    S.items[a] = made; S.items[b] = null;
    TFT.UI && TFT.UI.toast(`✨ ${made.name} oluşturuldu`, 'good');
    TFT.UI && TFT.UI.sfx('item');
    TFT.UI && TFT.UI.renderAll();
    return true;
  }
  function moveItemToSlot(from, to) {
    if (from === to) return;
    const tmp = S.items[to]; S.items[to] = S.items[from]; S.items[from] = tmp;
    TFT.UI && TFT.UI.renderItems();
  }
  function sellItem(slot) {
    if (!S.items[slot]) return;
    S.items[slot] = null;
    TFT.UI && TFT.UI.renderItems();
  }

  /* ================= CAROUSEL ================= */
  function openCarousel() {
    const opts = [];
    const costs = shuffle([1, 1, 2, 2, 3, 3, 4, 5]).slice(0, 8);
    const champs = shuffle(DATA.CHAMPS);
    for (let i = 0; i < 8; i++) {
      let c = champs.find(ch => ch.cost === costs[i] && !opts.some(o => o.champId === ch.id));
      if (!c) c = champs.find(ch => !opts.some(o => o.champId === ch.id));
      if (!c) break;
      const item = Bots.randomItem(S.stage);
      opts.push({ champId: c.id, item });
    }
    S.carousel = opts;
    S.carouselTimer = 20;
    S.phase = 'carousel';
    S.timer = 20;
    TFT.UI && TFT.UI.showCarousel(opts);
  }
  function pickCarousel(idx) {
    if (S.phase !== 'carousel' || !S.carousel) return;
    const opt = S.carousel[idx]; if (!opt) return;
    const champ = CH[opt.champId];
    if (!benchFree()) {
      const cheapest = S.bench.filter(Boolean).sort((a, b) => sellPrice(a) - sellPrice(b))[0];
      if (cheapest) {
        TFT.UI && TFT.UI.toast('Yedek doluydu: en ucuz birim satıldı', 'bad');
        sellUnit(cheapest.uid);
      }
      if (!benchFree()) { TFT.UI && TFT.UI.toast('Yedek alanı dolu!', 'bad'); return; }
    }
    addUnitToBench(opt.champId, 1, [opt.item]);
    pushLog(`🎠 ${champ.name} seçildi`);
    tip('carousel', 'Eşyayı birimin üzerine sürükleyerek takabilirsin. Birime en fazla 3 eşya takılır');
    S.carousel = null;
    S.phase = 'planning';
    S.timer = 30; S.timerMax = 30;
    TFT.UI && TFT.UI.hideModal();
    TFT.UI && TFT.UI.renderAll();
  }

  /* ================= AUGMENT ================= */
  function openAugment() {
    const pool = shuffle(DATA.AUGMENTS.filter(a => !S.augments.includes(a.id))).slice(0, 3);
    S.augmentOptions = pool;
    S.phase = 'augment';
    TFT.UI && TFT.UI.showAugments(pool);
  }
  function pickAugment(id) {
    const a = DATA.AUGMENTS.find(x => x.id === id); if (!a) return;
    S.augments.push(a.id);
    TFT.UI && TFT.UI.hideModal();
    const api = {
      addGold, addXp, healPlayer, giveRandomComponent, giveRandomCompletedItem, addGlobalBuff
    };
    a.apply(api);
    pushLog(`🧩 Augment: ${a.name}`);
    TFT.UI && TFT.UI.sfx('augment');
    S.phase = 'planning';
    S.augmentOptions = null;
    S.timer = 30; S.timerMax = 30;
    TFT.UI && TFT.UI.renderAll();
  }

  /* ================= TUR AKIŞI ================= */
  function beginRound() {
    if (!S.alive) return;
    S.roundType = roundPlan(S.stage, S.round);
    S.phase = 'planning';
    S.timer = S.stage === 1 ? 25 : 32;
    S.timerMax = S.timer;
    S.opponentId = null;
    S.combat = null;
    S.result = null;
    // botlar kadrolarını kurar
    S.bots.forEach(b => { if (b.alive) Bots.buildBoard(b, S.stage, S.round); });
    // savaş olacaksa rakibi şimdi belirle (önizleme için)
    if (S.roundType === 'pvp' || (S.roundType === 'carousel' && !(S.stage === 1 && S.round === 1))) {
      const opp = pickOpponent();
      if (opp) { S.nextOpponent = opp.id; TFT.UI && TFT.UI.showNextOpponent(opp); }
    } else { S.nextOpponent = null; TFT.UI && TFT.UI.hideNextOpponent(); }
    // mağaza
    if (!S.shopLocked) rollShop(true);
    if (isAugmentRound()) { openAugment(); }
    else if (S.roundType === 'carousel') { openCarousel(); }
    pushLog(`— ${S.stage}-${S.round} · ${S.roundType === 'pve' ? 'PvE' : S.roundType === 'carousel' ? 'Carousel' : 'PvP'} —`);
    if (S.stage === 1 && S.round === 1) tip('start', 'Yedekteki birimi tahtaya sürükle, sonra R ile savaşı başlat');
    if (S.stage === 2 && S.round === 1) tip('trait', 'Sol panelde sinerjilere tıklayarak eşikleri görebilirsin');
    if (S.stage === 3 && S.round === 1) tip('econ', 'Faiz için 10 altın üstü biriktir; seri bonusunu kaçırma');
    TFT.UI && TFT.UI.renderAll();
    TFT.UI && TFT.UI.renderTimer();
  }

  function pickOpponent() {
    const alive = S.bots.filter(b => b.alive);
    if (!alive.length) return null;
    let pool = alive.filter(b => b.id !== S.lastOpponent);
    if (!pool.length) pool = alive;
    const opp = choose(pool);
    S.lastOpponent = opp.id;
    S.opponentId = opp.id;
    return opp;
  }

  function startCombat() {
    if (S.phase === 'combat' || S.phase === 'result' || S.phase === 'gameover') return;
    if (S.phase === 'augment') { TFT.UI && TFT.UI.toast('Önce bir augment seç', 'bad'); return; }
    if (!S.board.length) { TFT.UI && TFT.UI.toast('Tahtada birim yok — bu savaşı kaybedeceksin!', 'bad'); }
    if (S.phase === 'carousel') { autoPickCarousel(); }
    S.phase = 'combat';
    S.result = null;
    const allies = S.board.map(u => ({ champId: u.champId, star: u.star, items: u.items, r: u.r, c: u.c }));
    let enemies = [], label = 'Rakip';
    if (combatType() === 'pve') {
      const waveKey = S.stage === 1 ? (S.round <= 3 ? 1 : 2) : S.stage;
      const p = Bots.pveSpecs(S.stage, waveKey);
      enemies = p.specs;
      label = 'PvE · ' + p.wave.name;
      S.pveReward = p;
    } else {
      let opp = S.bots.find(b => b.id === S.opponentId && b.alive);
      if (!opp) opp = pickOpponent();
      if (opp) {
        enemies = opp.board.map(u => ({ champId: u.champId, star: u.star, items: u.items, r: u.r, c: u.c }));
        label = opp.name + ' ' + opp.icon;
        S.pveReward = null;
      }
    }
    S.opponentLabel = label;
    S.combat = new TFT.Combat(allies, enemies, {
      stage: S.stage,
      allyBuffs: S.buffs
    });
    S.combatTime = 0;
    TFT.UI && TFT.UI.setCombatMode(true);
    TFT.UI && TFT.UI.renderAll();
    TFT.UI && TFT.UI.sfx('combat');
  }

  function combatDone() {
    if (!S.combat || S.result) return;
    const cb = S.combat;
    const win = cb.winner === 'ally';
    const draw = cb.winner === 'draw';
    const survivors = cb.survivors('enemy');
    S.stats.rounds++;
    if (win) S.stats.wins++; else S.stats.losses++;
    if (!win) tip('loss', 'Karakterlerin otomatik savaşır — yıldız, eşya ve sinerji gücü belirler');

    let playerDmg = 0;
    if (!win) playerDmg = damageFor(S.stage, survivors);
    if (draw) playerDmg = Math.ceil(damageFor(S.stage, survivors) * 0.5);

    if (combatType() === 'pve') {
      if (win) {
        addGold(S.pveReward.wave.gold);
        pushLog(`👾 ${S.pveReward.wave.name} yenildi! +${S.pveReward.wave.gold} altın`);
        if (rnd() < S.pveReward.wave.drop) { giveRandomComponent(); pushLog('🎁 Eşya düştü!'); }
      } else {
        S.hp = Math.max(0, S.hp - Math.max(2, Math.round(playerDmg * 0.5)));
        pushLog('💀 PvE dalgası kaybedildi');
      }
    } else {
      const opp = S.bots.find(b => b.id === S.opponentId);
      if (opp && opp.alive) {
        if (win) {
          const oppDmg = damageFor(S.stage, cb.survivors('ally'));
          opp.hp = Math.max(0, opp.hp - oppDmg);
          pushLog(`⚔️ ${opp.name} yenildi (-${oppDmg} can)`);
          if (opp.hp <= 0 && opp.alive) eliminateBot(opp);
        } else {
          S.hp = Math.max(0, S.hp - playerDmg);
          pushLog(`💀 ${opp.name} kazandı (-${playerDmg} can)`);
        }
      }
      // diğer botlar kendi aralarında
      botVsBotMatches();
    }

    // seri
    if (win) {
      if (S.streak >= 0) S.streak++; else S.streak = 1;
    } else {
      if (S.streak <= 0) S.streak--; else S.streak = -1;
    }
    S.stats.maxStreak = Math.max(S.stats.maxStreak, Math.abs(S.streak));

    // gelir
    const inc = calculateIncome(win);
    addGold(inc.total);
    pushLog(`🪙 Gelir: ${inc.total} (temel 5 + faiz ${inc.interest} + seri ${inc.streak}${inc.win ? ' + zafer 1' : ''})`);
    addXp(2);

    S.result = {
      win, draw, playerDmg,
      enemySurvivors: survivors.length,
      allySurvivors: cb.survivors('ally').length,
      timeout: cb.timeout,
      income: inc,
      label: S.opponentLabel
    };
    S.resultTimer = 2.4;
    S.phase = 'result';
    TFT.UI && TFT.UI.setCombatMode(false);
    TFT.UI && TFT.UI.showResult(S.result);
    TFT.UI && TFT.UI.renderAll();

    if (S.hp <= 0) { S.hp = 0; playerDied(); }
    else if (S.bots.every(b => !b.alive)) { playerWon(); }
  }

  function damageFor(stage, survivors) {
    const base = [0, 2, 2, 3, 4, 5, 6, 8, 10][Math.min(8, stage)] || 10;
    let dmg = base;
    (survivors || []).forEach(u => {
      dmg += (u.star || 1) >= 2 ? 2 : 1;
      if ((u.cost || 0) >= 4) dmg += 1;
    });
    return dmg;
  }

  function calculateIncome(win) {
    const cap = 5 + (S.buffs.interestCap || 0);
    const interest = Math.min(cap, Math.floor(S.gold / 10));
    const abs = Math.abs(S.streak);
    const streakBonus = abs >= 5 ? 3 : abs >= 4 ? 2 : abs >= 3 ? 1 : 0;
    let total = 5 + interest + streakBonus + (win ? 1 : 0) + (S.buffs.goldPerRound || 0);
    if (hasTraitActive('pirate')) { total += 2; }
    return { total, interest: interest, streak: streakBonus, win: win ? 1 : 0 };
  }

  function botVsBotMatches() {
    const alive = S.bots.filter(b => b.alive && b.id !== S.opponentId);
    const arr = shuffle(alive);
    for (let i = 0; i + 1 < arr.length; i += 2) {
      const a = arr[i], b = arr[i + 1];
      const r = Bots.fightBots(a, b);
      let loser = null;
      if (r === 'a') loser = b; else if (r === 'b') loser = a;
      if (!loser) { // beraberlik
        a.hp = Math.max(0, a.hp - 3); b.hp = Math.max(0, b.hp - 3);
        if (a.hp <= 0 && a.alive) eliminateBot(a);
        if (b.hp <= 0 && b.alive) eliminateBot(b);
        continue;
      }
      const dmg = damageFor(S.stage, Array.from({ length: 4 + Math.floor(rnd() * 4) }, () => ({ star: 1 + Math.floor(rnd() * 2), cost: 3 })));
      loser.hp = Math.max(0, loser.hp - dmg);
      if (loser.hp <= 0 && loser.alive) eliminateBot(loser);
    }
  }

  function eliminateBot(bot) {
    if (!bot.alive) return;
    bot.alive = false;
    const aliveCount = 1 + S.bots.filter(b => b.alive).length + (S.alive ? 1 : 0);
    bot.place = Math.max(1, aliveCount);
    pushLog(`☠️ ${bot.name} elendi (${bot.place}.)`);
    TFT.UI && TFT.UI.renderPlayers();
  }

  function saveBest() {
    try {
      const key = 'tft_best_place_v1';
      const best = +(window.localStorage.getItem(key) || 9);
      if (S.place && S.place < best) window.localStorage.setItem(key, S.place);
      return Math.min(best, S.place || 9);
    } catch (e) { return S.place; }
  }
  function getBest() {
    try { return +(window.localStorage.getItem('tft_best_place_v1') || 9); } catch (e) { return 9; }
  }

  function playerDied() {
    S.alive = false;
    S.place = Math.max(1, Math.min(8, S.bots.filter(b => b.alive).length + 1));
    S.phase = 'gameover';
    S.best = saveBest();
    TFT.UI && TFT.UI.showGameOver(false);
  }
  function playerWon() {
    S.place = 1;
    S.phase = 'gameover';
    S.best = saveBest();
    TFT.UI && TFT.UI.showGameOver(true);
  }

  function nextRound() {
    if (S.phase === 'gameover') return;
    S.round++;
    if (S.round > roundsInStage(S.stage)) { S.stage++; S.round = 1; }
    if (S.stage > 8) { // güvenlik
      S.stage = 8;
    }
    beginRound();
  }

  /* ================= TICK ================= */
  function tick(dt) {
    if (S.phase === 'planning') {
      S.timer -= dt;
      if (S.timer <= 0) { S.timer = 0; startCombat(); }
      TFT.UI && TFT.UI.renderTimer();
    } else if (S.phase === 'carousel') {
      S.timer -= dt;
      if (S.timer <= 0) { autoPickCarousel(); }
    } else if (S.phase === 'result') {
      S.resultTimer -= dt;
      if (S.resultTimer <= 0 && S.phase !== 'gameover') nextRound();
    }
  }

  function autoPickCarousel() {
    if (!S.carousel) { S.phase = 'planning'; return; }
    // en pahalı seçeneği al
    let best = 0;
    S.carousel.forEach((o, i) => { if (CH[o.champId].cost > CH[S.carousel[best].champId].cost) best = i; });
    if (!benchFree()) { S.carousel = null; S.phase = 'planning'; S.timer = 30; TFT.UI && TFT.UI.hideModal(); return; }
    pickCarousel(best);
  }

  /* ================= BAŞLAT ================= */
  function init() {
    reset();
    TFT.UI.init();
    TFT.UI.renderAll();
    pushLog('TFT Arena — Offline. İyi şanslar!');
    let seen = false;
    try { seen = !!window.localStorage.getItem('tft_seen_welcome_v1'); } catch (e) { }
    if (!seen) {
      TFT.UI.showWelcome(() => {
        try { window.localStorage.setItem('tft_seen_welcome_v1', '1'); } catch (e) { }
        beginRound();
      });
    } else {
      beginRound();
    }
  }
  function restart() {
    reset();
    TFT.UI.hideModal();
    TFT.UI.setCombatMode(false);
    TFT.UI.renderAll();
    beginRound();
  }

  TFT.Game = {
    S, init, restart, tick,
    rollShop, buyUnit, buyXp, toggleLock,
    placeUnit, benchUnit, sellUnit, autoArrange, unitByUid, allUnits, unitAt,
    equipItem, combineItems, moveItemToSlot, sellItem, addItem,
    pickCarousel, pickAugment, startCombat, combatDone,
    addGold, addXp, healPlayer, addGlobalBuff, giveRandomComponent, giveRandomCompletedItem,
    traitCounts, activeTraits, teamSize, boardCount, sellPrice,
    hasTraitActive, roundPlan, combatType, pushLog, getBest
  };

  // otomatik başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TFT.Game.init());
  } else {
    setTimeout(() => TFT.Game.init(), 0);
  }
})();
