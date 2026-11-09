/* Otomatik oynatma / denge testi:
   NODE_PATH=/tmp/domtest/node_modules node tests/autoplay.js [oyunSayisi]     */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const GAMES = +(process.argv[2] || 3);

function playGame(gameNo) {
  return new Promise(resolve => {
    const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
      url: 'file://' + path.join(ROOT, 'index.html'),
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: false,
      beforeParse(window) {
        window.__raf = null;
        window.requestAnimationFrame = cb => { window.__raf = cb; return 1; };
        window.cancelAnimationFrame = () => { };
        window.__errors = [];
        window.addEventListener('error', e => window.__errors.push(e.message + ' @' + e.lineno));
      }
    });
    const w = dom.window, d = w.document;
    let t = 1000;
    const step = (ms = 16) => { t += ms; const cb = w.__raf; if (cb) { w.__raf = null; cb(t); } };
    const steps = (n, ms) => { for (let i = 0; i < n; i++) step(ms); };

    const ready = () => new Promise(res => {
      if (d.readyState === 'complete') return res();
      w.addEventListener('load', () => res());
      setTimeout(res, 1500);
    });

    ready().then(() => {
      steps(2);
      const wb = d.getElementById('btn-welcome'); if (wb) wb.click();
      step();
      const G = w.TFT.Game, S = G.S, D = w.TFT.DATA;
      const log = [];
      let guard = 0, lastKey = '';

      const autoBuy = () => {
        // pahalıdan uca doğru al
        for (let i = 0; i < 5; i++) {
          if (!S.shop[i]) continue;
          const ch = D.CHAMP_BY_ID[S.shop[i]];
          if (S.gold >= ch.cost) G.buyUnit(i);
        }
      };
      const autoPlace = () => {
        const cap = G.teamSize();
        while (G.boardCount() < cap) {
          const benchUnits = G.allUnits().filter(u => u.r < 0);
          if (!benchUnits.length) break;
          benchUnits.sort((a, b) => D.CHAMP_BY_ID[b.champId].cost * b.star - D.CHAMP_BY_ID[a.champId].cost * a.star);
          const u = benchUnits[0];
          let done = false;
          for (let r = 7; r >= 4 && !done; r--) for (let c = 0; c < 7 && !done; c++) {
            if (!G.unitAt(r, c)) done = G.placeUnit(u.uid, r, c);
          }
          if (!done) break;
        }
      };
      const autoItems = () => {
        // bileşenleri birleştir
        for (let i = 0; i < D.ITEM_BENCH_SIZE; i++) {
          for (let j = i + 1; j < D.ITEM_BENCH_SIZE; j++) {
            if (S.items[i] && S.items[j] && S.items[i].comp && S.items[j].comp) { G.combineItems(i, j); break; }
          }
        }
        // en iyi birime tak
        const best = G.allUnits().slice().sort((a, b) => D.CHAMP_BY_ID[b.champId].cost - D.CHAMP_BY_ID[a.champId].cost)[0];
        if (!best) return;
        for (let i = 0; i < D.ITEM_BENCH_SIZE; i++) {
          if (S.items[i] && best.items.length < 3) G.equipItem(best.uid, i);
        }
      };
      const autoShop = () => {
        autoBuy();
        autoPlace();
        autoItems();
        if (S.gold > 26 && S.level < 9) G.buyXp();
        if (S.gold > 40) { G.rollShop(false); autoBuy(); autoPlace(); }
      };

      while (guard++ < 6000) {
        step(50);
        const key = S.phase + ':' + S.stage + '-' + S.round;
        if (S.phase === 'augment' && S.augmentOptions) G.pickAugment(S.augmentOptions[0].id);
        else if (S.phase === 'carousel' && S.carousel) {
          if (!S.bench.some(b => !b)) {
            const worst = G.allUnits().filter(u => u.r < 0).sort((a, b) => D.CHAMP_BY_ID[a.champId].cost - D.CHAMP_BY_ID[b.champId].cost)[0];
            if (worst) G.sellUnit(worst.uid);
          }
          G.pickCarousel(0);
        } else if (S.phase === 'planning' && lastKey !== key) {
          autoShop();
          log.push(`T${S.stage}-${S.round} hp=${S.hp} gold=${S.gold} lvl=${S.level} board=${G.boardCount()}/${G.teamSize()} aug=${S.augments.length}`);
          steps(2);
          G.startCombat();
          steps(1);
          if (S.phase === 'combat') w.TFT.UI.skipCombat();
          S.bots.forEach(b => { });
          const opp = S.bots.find(b => b.id === S.opponentId);
          log[log.length - 1] += ` | rakip=${opp ? opp.name + '(' + opp.level + ')' : 'PvE'} sonuc=${S.result ? (S.result.win ? 'G' : 'M') : '-'}`;
        }
        lastKey = key;
        if (S.phase === 'gameover') break;
        if (S.stage > 7) break;
      }
      const errs = w.__errors;
      const summary = {
        game: gameNo, place: S.place, hp: S.hp, stage: S.stage + '-' + S.round,
        rounds: S.stats.rounds, wins: S.stats.wins, losses: S.stats.losses,
        level: S.level, augments: S.augments.length,
        botHp: S.bots.map(b => b.alive ? b.hp : 'X').join(','),
        errors: errs.slice(0, 3), log
      };
      dom.window.close();
      resolve(summary);
    });
  });
}

(async () => {
  const results = [];
  for (let i = 0; i < GAMES; i++) {
    const r = await playGame(i + 1);
    results.push(r);
    console.log(`\n=== OYUN ${r.game} — ${r.place}. sıra · hp ${r.hp} · ${r.stage} · ${r.rounds} tur (${r.wins}G/${r.losses}M) · lvl ${r.level} · augment ${r.augments}`);
    console.log('botlar: ' + r.botHp);
    if (r.errors.length) console.log('HATALAR: ' + r.errors.join(' | '));
    r.log.forEach(l => console.log('  ' + l));
  }
  const avgRounds = results.reduce((s, r) => s + r.rounds, 0) / results.length;
  const places = results.map(r => r.place);
  console.log(`\nOrtalama tur: ${avgRounds.toFixed(1)} · sıralamalar: ${places.join(', ')}`);
  const errCount = results.reduce((s, r) => s + r.errors.length, 0);
  console.log(errCount ? '❌ ' + errCount + ' hata' : '✅ hata yok');
})();
