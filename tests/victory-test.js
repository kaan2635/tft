/* Zafer / eleme akışı testi (jsdom):
   NODE_PATH=/tmp/domtest/node_modules node tests/victory-test.js          */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');

let fails = 0;
const assert = (c, m) => { console.log((c ? '  ✓ ' : '  ❌ ') + m); if (!c) fails++; };

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  url: 'file://' + path.join(ROOT, 'index.html'), runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: false,
  beforeParse(w) {
    w.__raf = null; w.requestAnimationFrame = cb => { w.__raf = cb; return 1; };
    w.cancelAnimationFrame = () => { }; w.__errors = [];
    w.addEventListener('error', e => w.__errors.push(e.message));
  }
});
const w = dom.window, d = w.document;
let t = 1000;
const step = (ms = 16) => { t += ms; const cb = w.__raf; if (cb) { w.__raf = null; cb(t); } };
const ready = () => new Promise(r => { if (d.readyState === 'complete') return r(); w.addEventListener('load', () => r()); setTimeout(r, 1500); });

ready().then(() => {
  step();
  const wb = d.getElementById('btn-welcome'); if (wb) wb.click(); step();
  const G = w.TFT.Game, S = G.S, D = w.TFT.DATA;
  assert(!!G, 'oyun başladı');

  let last = '', guard = 0;
  while (guard++ < 20000 && S.phase !== 'gameover') {
    step(40);
    const key = S.phase + ':' + S.stage + '-' + S.round;
    if (S.phase === 'augment' && S.augmentOptions) G.pickAugment(S.augmentOptions[0].id);
    else if (S.phase === 'carousel' && S.carousel) G.pickCarousel(0);
    else if (S.phase === 'planning' && last !== key) {
      // güçlü kadro kur
      S.level = 8; S.gold = 120;
      for (let i = 0; i < 4; i++) { G.rollShop(false); for (let j = 0; j < 5; j++) G.buyUnit(j); }
      while (G.boardCount() < G.teamSize()) {
        const u = G.allUnits().filter(x => x.r < 0)
          .sort((a, b) => D.CHAMP_BY_ID[b.champId].cost - D.CHAMP_BY_ID[a.champId].cost)[0];
        if (!u) break;
        let ok = false;
        for (let r = 7; r >= 4 && !ok; r--) for (let c = 0; c < 7 && !ok; c++) if (!G.unitAt(r, c)) ok = G.placeUnit(u.uid, r, c);
        if (!ok) break;
      }
      G.autoArrange();
      // botları tek vuruşluk bırak → hızlı eleme
      S.bots.forEach(b => { if (b.alive) b.hp = 1; });
      step(); G.startCombat(); step();
      if (S.phase === 'combat') w.TFT.UI.skipCombat();
    }
    last = key;
  }

  console.log('\n— Sonuç —');
  assert(S.phase === 'gameover', 'oyun sona erdi');
  assert(S.bots.every(b => !b.alive), 'tüm botlar elendi');
  const modalOpen = !d.getElementById('modal-root').classList.contains('hidden');
  const restart = d.getElementById('btn-restart');
  assert(modalOpen && !!restart, 'oyun sonu modalı görünür');
  if (restart) {
    restart.click(); step();
    assert(S.stage === 1 && S.round === 1 && S.hp === 100, 'yeniden başlatma çalıştı');
  }
  assert(w.__errors.length === 0, 'çalışma zamanı hatası yok');
  console.log(fails === 0 ? '\n✅ ZAFER AKIŞI TESTİ GEÇTİ' : '\n❌ ' + fails + ' HATA');
  process.exit(fails ? 1 : 0);
}).catch(e => { console.error(e); process.exit(1); });
