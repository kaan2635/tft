/* Mobil uçtan uca oyun akışı: sadece dokunma/click ile bir oyun tamamlanır.
   NODE_PATH=/tmp/domtest/node_modules node tests/mobile-flow-test.js        */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let fails = 0;
const assert = (c, m) => { if (!c) { console.log('❌ ' + m); fails++; } else console.log('  ✓ ' + m); };

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  url: 'file://' + path.join(ROOT, 'index.html'),
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: false,
  beforeParse(window) {
    window.__rafQ = [];
    window.requestAnimationFrame = cb => { window.__rafQ.push(cb); return window.__rafQ.length; };
    window.cancelAnimationFrame = () => { };
    window.__errors = [];
    window.onerror = (m, f, l, c, err) => { window.__errors.push((err && err.stack) || m); };
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });
    window.matchMedia = q => ({
      matches: /pointer:coarse/.test(q), media: q,
      addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { }, onchange: null
    });
  }
});

const window = dom.window;
const document = window.document;

let t = 1000;
function step(ms) {
  ms = ms || 16; t += ms;
  const q = window.__rafQ; window.__rafQ = [];
  q.forEach(cb => { try { cb(t); } catch (e) { window.__errors.push(e.stack || String(e)); } });
}
function steps(n) { for (let i = 0; i < (n || 3); i++) step(); }
const boot = () => new Promise(r => { if (document.readyState === 'complete') return r(); window.addEventListener('load', () => r()); setTimeout(r, 1500); });

function click(el) {
  if (!el) return false;
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX: 25, clientY: 25 }));
  return true;
}
function tap(el) {
  if (!el) return false;
  el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 25, clientY: 25 }));
  el.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: 25, clientY: 25 }));
  return true;
}

(async () => {
  await boot();
  steps(4);
  const G = window.TFT && window.TFT.Game;
  assert(!!G, 'Game yüklendi');
  if (!G) { console.log(window.__errors); process.exit(1); }
  const S = G.S;
  const CH = window.TFT.DATA.CHAMP_BY_ID;

  click(document.getElementById('btn-welcome')); steps(3);
  assert(document.body.classList.contains('is-mobile'), 'mobil mod aktif');

  const freeHex = () => {
    for (const r of [4, 5, 6, 7]) for (let c = 0; c < 7; c++) if (!G.unitAt(r, c)) return { r, c };
    return null;
  };
  // yedekteki birimleri dokunarak tahtaya koy
  const placeByTaps = () => {
    let guard = 0;
    while (G.boardCount() < G.teamSize() && guard++ < 12) {
      const bench = G.allUnits().filter(u => u.r < 0);
      if (!bench.length) break;
      const b = bench.sort((a, c) => CH[c.champId].cost - CH[a.champId].cost)[0];
      const token = document.querySelector(`#bench .unit-token[data-uid="${b.uid}"]`);
      if (!token) break;
      tap(token);
      const h = freeHex();
      if (!h) break;
      const hexEl = document.querySelector(`#board .hex[data-r="${h.r}"][data-c="${h.c}"]`);
      click(hexEl);
      if (G.unitByUid(b.uid).r < 0) break;
    }
  };

  let guard = 0, lastKey = '', skipDone = false, rounds = 0, shopTaps = 0, augs = 0, carousels = 0;
  while (guard++ < 6000 && S.phase !== 'gameover') {
    step(50);
    const key = S.phase + ':' + S.stage + '-' + S.round + (S.phase === 'combat' ? ':' + S.roundsPlayed : '');
    if (S.phase === 'carousel') {
      carousels++;
      if (G.allUnits().filter(u => u.r < 0).length >= 9) {
        const w2 = G.allUnits().filter(u => u.r < 0).sort((a, b) => CH[a.champId].cost - CH[b.champId].cost)[0];
        if (w2) G.sellUnit(w2.uid);
      }
      click(document.querySelector('.carousel-card')); steps(2);
    } else if (S.phase === 'augment') {
      augs++;
      click(document.querySelector('.augment-card')); steps(2);
    } else if (S.phase === 'planning' && lastKey !== key) {
      rounds++;
      // mağazayı dokunarak satın al
      document.querySelectorAll('#shop .shop-card').forEach(c => { if (click(c)) shopTaps++; });
      steps(2);
      placeByTaps();
      steps(2);
      // tahtada bir birime dokun → alt sayfa açılır, kapat
      const tok = document.querySelector('#unit-layer .unit-token:not(.enemy-token)');
      if (tok) {
        tap(tok); steps(1);
        const sheet = document.getElementById('sheet-root');
        if (!sheet.classList.contains('hidden')) {
          click(sheet.querySelector('[data-sheet-close]')); steps(1);
        }
      }
      click(document.getElementById('btn-arrange')); steps(1);
      click(document.getElementById('btn-ready')); steps(2);
      if (S.phase === 'combat') skipDone = false;
    } else if (S.phase === 'combat' && !skipDone) {
      skipDone = true;
      click(document.getElementById('btn-skip')); steps(2);
    }
    lastKey = key;
  }

  console.log(`\n— Oyun sonucu — tur ${rounds}, mağaza dokunuşu ${shopTaps}, augment ${augs}, carousel ${carousels}`);
  assert(S.phase === 'gameover', 'oyun dokunarak sonuna kadar oynandı (phase=' + S.phase + ')');
  assert(S.place >= 1 && S.place <= 8, 'sıralama hesaplandı (' + S.place + '.)');
  assert(rounds > 4, 'en az 5 tur oynandı (' + rounds + ')');
  assert(shopTaps > 0, 'mağaza dokunuşları işledi');
  assert(augs > 0, 'augment seçimi dokunuşla yapıldı');
  const go = document.getElementById('modal-root');
  assert(go && !go.classList.contains('hidden'), 'oyun sonu ekranı göründü');
  const errs = window.__errors.filter(e => !/Not implemented/.test(e));
  assert(errs.length === 0, 'çalışma zamanı hatası yok' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  console.log(fails ? `\n❌ ${fails} test başarısız` : '\n✅ MOBİL OYUN AKIŞI GEÇTİ');
  process.exit(fails ? 1 : 0);
})();
