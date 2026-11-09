/* Daha "iyi" oynayan otomatik test oyuncusu (denge ölçümü) */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const GAMES = +(process.argv[2] || 4);

function playGame(n) {
  return new Promise(resolve => {
    const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
      url: 'file://' + path.join(ROOT, 'index.html'), runScripts: 'dangerously', resources: 'usable',
      pretendToBeVisual: false,
      beforeParse(w) {
        w.__raf = null; w.requestAnimationFrame = cb => { w.__raf = cb; return 1; };
        w.cancelAnimationFrame = () => { }; w.__errors = [];
        w.addEventListener('error', e => w.__errors.push(e.message + '@' + e.lineno));
      }
    });
    const w = dom.window, d = w.document;
    let t = 1000;
    const step = (ms = 16) => { t += ms; const cb = w.__raf; if (cb) { w.__raf = null; cb(t); } };
    const ready = () => new Promise(res => { if (d.readyState === 'complete') return res(); w.addEventListener('load', () => res()); setTimeout(res, 1500); });
    ready().then(() => {
      step(); step();
      const G = w.TFT.Game, S = G.S, D = w.TFT.DATA, CH = D.CHAMP_BY_ID;
      const Bots = w.TFT.Bots;
      const log = [];
      let guard = 0, lastKey = '', comp = null, team = null;
      const pickComp = () => {
        const carry = D.CHAMPS.filter(c => c.cost >= 4 && c.cost <= 5)[Math.floor(Math.random() * 8)];
        comp = carry.traits.slice();
        team = new Set();
      };
      const fits = ch => ch.traits.some(t => comp.includes(t));
      const buy = () => {
        for (let i = 0; i < 5; i++) {
          if (!S.shop[i]) continue;
          const ch = CH[S.shop[i]];
          if (S.stage > 2 && !fits(ch) && !S.bench.every(b => b)) continue;
          if (S.gold >= ch.cost && (S.bench.some(b => !b) || G.allUnits().filter(u => u.champId === ch.id && u.star === 1).length >= 2)) G.buyUnit(i);
        }
      };
      const place = () => {
        const cap = G.teamSize();
        const bench = G.allUnits().filter(u => u.r < 0);
        bench.sort((a, b) => (CH[b.champId].cost * b.star) - (CH[a.champId].cost * a.star));
        for (const u of bench) {
          if (G.boardCount() >= cap) break;
          const melee = CH[u.champId].range <= 1;
          const rows = melee ? [4, 5, 6, 7] : [7, 6, 5, 4];
          let done = false;
          for (const r of rows) { for (let c = 0; c < 7 && !done; c++) { if (!G.unitAt(r, c)) done = G.placeUnit(u.uid, r, c); } if (done) break; }
        }
      };
      const items = () => {
        for (let i = 0; i < D.ITEM_BENCH_SIZE; i++) for (let j = i + 1; j < D.ITEM_BENCH_SIZE; j++)
          if (S.items[i] && S.items[j] && S.items[i].comp && S.items[j].comp) G.combineItems(i, j);
        const carry = G.allUnits().slice().sort((a, b) => CH[b.champId].cost * b.star - CH[a.champId].cost * a.star)[0];
        if (!carry) return;
        for (let i = 0; i < D.ITEM_BENCH_SIZE; i++) if (S.items[i] && carry.items.length < 3) G.equipItem(carry.uid, i);
      };
      const economy = () => {
        if (S.level < 8 && S.gold >= (S.stage <= 2 ? 12 : 24)) G.buyXp();
        if (S.gold > 32) { G.rollShop(false); buy(); }
      };

      while (guard++ < 8000) {
        step(50);
        const key = S.phase + ':' + S.stage + '-' + S.round;
        if (!comp) pickComp();
        if (S.phase === 'augment' && S.augmentOptions) G.pickAugment(S.augmentOptions[0].id);
        else if (S.phase === 'carousel' && S.carousel) {
          if (!S.bench.some(b => !b)) { const w2 = G.allUnits().filter(u => u.r < 0).sort((a, b) => CH[a.champId].cost - CH[b.champId].cost)[0]; if (w2) G.sellUnit(w2.uid); }
          let best = 0; S.carousel.forEach((o, i) => { if (fits(CH[o.champId]) && !fits(CH[S.carousel[best].champId])) best = i; });
          G.pickCarousel(best);
        } else if (S.phase === 'planning' && lastKey !== key) {
          buy(); place(); items(); economy(); buy(); place();
          log.push(`T${S.stage}-${S.round} hp=${S.hp} g=${S.gold} lvl=${S.level} b=${G.boardCount()} yildiz=${G.allUnits().map(u => u.star).join('')}`);
          step(); G.startCombat(); step();
          if (S.phase === 'combat') w.TFT.UI.skipCombat();
          const opp = S.bots.find(b => b.id === S.opponentId);
          log[log.length - 1] += ` rakip=${opp ? opp.name : 'PvE'} ${S.result ? (S.result.win ? 'G' : 'M') : '-'}`;
        }
        lastKey = key;
        if (S.phase === 'gameover') break;
      }
      resolve({ place: S.place, hp: S.hp, rounds: S.stats.rounds, wins: S.stats.wins, losses: S.stats.losses, stage: S.stage + '-' + S.round, level: S.level, errors: w.__errors.slice(0, 2), log });
      dom.window.close();
    });
  });
}
(async () => {
  const res = [];
  for (let i = 0; i < GAMES; i++) {
    const r = await playGame(i + 1);
    res.push(r);
    console.log(`\n=== OYUN ${i + 1} — ${r.place}. sıra · hp ${r.hp} · ${r.rounds} tur · ${r.wins}G/${r.losses}M · lvl ${r.level} · ${r.stage}`);
    if (r.errors.length) console.log('HATA: ' + r.errors.join('|'));
    r.log.forEach(l => console.log('  ' + l));
  }
  console.log('\nSıralamalar: ' + res.map(r => r.place).join(', ') + ' · ort tur ' + (res.reduce((s, r) => s + r.rounds, 0) / res.length).toFixed(1));
})();
