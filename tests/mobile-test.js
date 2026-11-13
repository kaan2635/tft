/* Mobil (telefon) arayüz testi:
   NODE_PATH=/tmp/domtest/node_modules node tests/mobile-test.js            */
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
      matches: /pointer:coarse/.test(q),
      media: q, addListener() { }, removeListener() { },
      addEventListener() { }, removeEventListener() { }, onchange: null
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

function boot() {
  return new Promise(resolve => {
    if (document.readyState === 'complete') return resolve();
    window.addEventListener('load', () => resolve());
    setTimeout(() => resolve(), 1500);
  });
}

function pointer(el, type, extra) {
  const ev = new window.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: 20, clientY: 20 }, extra || {}));
  el.dispatchEvent(ev);
}
function tap(el) { pointer(el, 'pointerdown'); pointer(el, 'pointerup'); steps(2); }

(async () => {
  await boot();
  steps(4);
  const G = window.TFT && window.TFT.Game;
  assert(!!G, 'Game yüklendi');
  if (!G) { console.log(window.__errors); process.exit(1); }
  const S = G.S;
  const UI = window.TFT.UI;

  const welcome = document.getElementById('btn-welcome');
  if (welcome) { welcome.click(); steps(3); }
  if (S.phase === 'carousel') { G.pickCarousel(0); steps(3); }

  console.log('\n— Mobil mod algılama —');
  UI.applyMode(); steps(2);
  assert(document.body.classList.contains('is-mobile'), 'dar ekran → body.is-mobile');
  const root = document.documentElement;
  assert(!!root.style.getPropertyValue('--shop-h'), '--shop-h ölçüldü (' + root.style.getPropertyValue('--shop-h') + ')');
  assert(!!root.style.getPropertyValue('--top-h'), '--top-h ölçüldü');
  assert(!!root.style.getPropertyValue('--bar-h'), '--bar-h ölçüldü');

  console.log('\n— Dokunmatik mağaza —');
  G.addGold(60);
  S.level = 6;
  G.rollShop(false); steps(2);
  const cards = document.querySelectorAll('#shop .shop-card');
  assert(cards.length === 5, 'mağaza 5 kart');
  const costClass = Array.from(cards).some(c => /(^|\s)c[1-5](\s|$)/.test(c.className));
  assert(costClass, 'kartlarda maliyet sınıfı (c1..c5) var');
  assert(document.querySelectorAll('#shop .sc-portrait .portrait-icon').length === 5, 'kartlarda portre ikonu var');
  const before = G.allUnits().length;
  cards[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true })); steps(2);
  assert(G.allUnits().length > before, 'karta dokunmak birim aldı');

  console.log('\n— Portreli birim jetonu —');
  const bu = S.bench.filter(Boolean)[0];
  assert(!!bu, 'yedeğe birim geldi');
  G.placeUnit(bu.uid, 4, 3); steps(2);
  const token = document.querySelector('#unit-layer .unit-token:not(.enemy-token)');
  assert(!!token, 'tahtada oyuncu jetonu var');
  assert(!!token.querySelector('.unit-portrait .portrait-icon'), 'jetonda portre ikonu var');
  assert(!!token.querySelector('.unit-ring').getAttribute('style'), 'jeton halkasında renk gradyanı var');

  console.log('\n— Birim bilgi alt sayfası (tap) —');
  tap(token);
  const sheet = document.getElementById('sheet-root');
  assert(!sheet.classList.contains('hidden'), 'jetona dokunmak alt sayfayı açtı');
  assert(!!sheet.querySelector('.sheet-name'), 'alt sayfada isim var');
  assert(!!sheet.querySelector('.sheet-ability'), 'alt sayfada yetenek açıklaması var');
  assert(sheet.querySelectorAll('.sheet-stat').length >= 5, 'alt sayfada istatistikler var');
  const sellBtn = sheet.querySelector('[data-sheet-sell]');
  const countBefore = G.allUnits().length;
  assert(!!sellBtn, 'sat butonu var');
  sellBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); steps(3);
  assert(G.allUnits().length === countBefore - 1, 'alt sayfadaki sat butonu birimi sattı');
  assert(sheet.classList.contains('hidden'), 'satıştan sonra alt sayfa kapandı');

  console.log('\n— Sinerji çekmecesi —');
  const trBtn = document.getElementById('btn-traits');
  trBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); steps(2);
  assert(document.getElementById('traits-panel').classList.contains('open'), 'sinerji çekmecesi açıldı');
  assert(document.getElementById('drawer-backdrop').classList.contains('show'), 'perde göründü');
  document.getElementById('drawer-backdrop').dispatchEvent(new window.MouseEvent('click', { bubbles: true })); steps(2);
  assert(!document.getElementById('traits-panel').classList.contains('open'), 'perdeye dokunmak çekmeceyi kapattı');

  console.log('\n— Dokunmatik eşya takma —');
  if (!document.querySelector('#unit-layer .unit-token:not(.enemy-token)')) {
    const b2 = S.bench.filter(Boolean)[0];
    if (b2) { G.placeUnit(b2.uid, 4, 3); steps(2); }
  }
  G.giveRandomComponent(); steps(2);
  const slot = document.querySelector('#item-bench .item-slot.filled');
  assert(!!slot, 'eşya yuvası dolu');
  tap(slot);
  assert(!!document.querySelector('#item-bench .item-slot.selected'), 'eşya yuvası seçildi');
  const hint = document.getElementById('item-hint');
  assert(hint && !hint.classList.contains('hidden'), 'eşya ipucu göründü');
  const target = document.querySelector('#unit-layer .unit-token:not(.enemy-token)');
  assert(!!target, 'eşya takılacak birim var');
  tap(target);
  assert(G.allUnits().some(u => u.items.length > 0), 'birime dokunmak eşyayı taktı');
  assert(hint.classList.contains('hidden'), 'takma sonrası ipucu kapandı');

  console.log('\n— Dokunmatik yerleştirme (yedek → tahta) —');
  let benchUnit = S.bench.filter(Boolean)[0];
  if (!benchUnit) {
    G.addGold(20); G.rollShop(false); steps(2);
    document.querySelectorAll('#shop .shop-card')[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true })); steps(2);
    benchUnit = S.bench.filter(Boolean)[0];
  }
  assert(!!benchUnit, 'yerleştirilecek yedek birim var');
  const benchToken = document.querySelector(`#bench .unit-token[data-uid="${benchUnit.uid}"]`);
  assert(!!benchToken, 'yedekte jeton var');
  tap(benchToken);
  assert(document.getElementById('sheet-root').classList.contains('hidden'), 'yedek birimde ilk dokunuş alt sayfa açmıyor (seçim)');
  assert(!!document.querySelector(`#bench .unit-token[data-uid="${benchUnit.uid}"].selected`), 'yedek jetonu seçildi');
  assert(!document.getElementById('item-hint').classList.contains('hidden'), 'yerleştirme ipucu göründü');
  assert(document.getElementById('board').classList.contains('placing'), 'yerleştirme modunda oyuncu kareleri vurgulandı');
  const hex = document.querySelector('#board .hex[data-r="4"][data-c="2"]');
  assert(!!hex, 'tahta karesi bulundu');
  hex.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); steps(2);
  const placed = G.unitByUid(benchUnit.uid);
  assert(placed && placed.r === 4 && placed.c === 2, 'kareye dokunmak birimi yerleştirdi');
  assert(!document.getElementById('board').classList.contains('placing'), 'yerleştirme modu kapandı');

  console.log('\n— Masaüstüne dönüş —');
  window.innerWidth = 1400; window.innerHeight = 900;
  window.dispatchEvent(new window.Event('resize')); steps(3);
  assert(!document.body.classList.contains('is-mobile'), 'geniş ekran → mobil sınıf kaldırıldı');
  assert(!root.style.getPropertyValue('--shop-h'), 'masaüstünde ölçüm değişkenleri temizlendi');
  assert(!document.getElementById('traits-panel').classList.contains('open'), 'masaüstünde çekmece kapalı');

  const errs = window.__errors.filter(e => !/Not implemented/.test(e));
  assert(errs.length === 0, 'çalışma zamanı hatası yok' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  console.log(fails ? `\n❌ ${fails} test başarısız` : '\n✅ MOBİL TESTLER GEÇTİ');
  process.exit(fails ? 1 : 0);
})();
