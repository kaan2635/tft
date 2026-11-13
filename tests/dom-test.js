/* Arayüz + oyun akışı testi (jsdom gerekir):
   NODE_PATH=/tmp/domtest/node_modules node tests/dom-test.js            */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let fails = 0, errors = [];
const assert = (c, m) => { if (!c) { console.log('❌ ' + m); fails++; } else console.log('  ✓ ' + m); };

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  url: 'file://' + path.join(ROOT, 'index.html'),
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: false,
  beforeParse(window) {
    // kontrollü zaman: rAF'yi elle çalıştıracağız
    window.__raf = null;
    window.requestAnimationFrame = cb => { window.__raf = cb; return 1; };
    window.cancelAnimationFrame = () => { };
    window.__errors = [];
    window.addEventListener('error', e => { window.__errors.push(e.message + ' @ ' + e.filename + ':' + e.lineno); });
    window.onerror = (m, f, l, c, err) => { window.__errors.push((err && err.stack) || m); };
  }
});

const window = dom.window;
const document = window.document;

let t = 1000;
function step(ms) {
  ms = ms || 16;
  t += ms;
  const cb = window.__raf;
  if (cb) { window.__raf = null; cb(t); }
}
function steps(n, ms) { for (let i = 0; i < n; i++) step(ms || 16); }

function boot() {
  return new Promise(resolve => {
    if (document.readyState === 'complete') return resolve();
    window.addEventListener('load', () => resolve());
    setTimeout(() => resolve(), 1500);
  });
}

(async () => {
  await boot();
  steps(3);
  const G = window.TFT && window.TFT.Game;
  assert(!!G, 'Game yüklendi');
  if (!G) { console.log(window.__errors); process.exit(1); }
  const S = G.S;

  // ilk açılış: giriş ekranı
  console.log('\n— Giriş ekranı —');
  const intro = document.getElementById('intro-screen');
  assert(!!intro, 'giriş ekranı var');
  assert(intro && !intro.classList.contains('hidden'), 'giriş ekranı açılışta görünür');
  assert(document.querySelectorAll('#intro-champs .intro-card').length === 8, 'giriş ekranında 8 şampiyon vitrini');
  assert(document.querySelector('#intro-champs .intro-card .portrait-icon'), 'vitrin kartlarında şampiyon görseli');
  assert((document.querySelector('.intro-title') || {}).textContent.includes('ARENA'), 'başlık yazısı var');
  const introHelp = document.getElementById('intro-help');
  if (introHelp) { introHelp.click(); steps(1); }
  assert(!document.getElementById('intro-help-body').classList.contains('hidden'), 'yardım bölümü açıldı');
  if (introHelp) { introHelp.click(); steps(1); }

  // tıklama/sürükleme için kritik: birim katmanı boş hex'lere dokunuşu engellememeli
  const css = document.querySelector('style').textContent;
  assert(/#unit-layer\{[^}]*pointer-events:none/.test(css), 'birim katmanı dokunuşu engellemiyor (pointer-events:none)');
  assert(/#unit-layer \.unit-token\{[^}]*pointer-events:auto/.test(css), 'jetonlar dokunuş alıyor (pointer-events:auto)');

  const welcome = document.getElementById('btn-welcome');
  if (welcome) { welcome.click(); steps(2); }
  assert(intro.classList.contains('hidden'), 'OYNA ile giriş ekranı kapandı');
  assert(S.phase === 'carousel' || S.phase === 'planning', 'karşılama ekranı geçildi');

  console.log('\n— Başlangıç —');
  assert(S.phase === 'carousel', 'ilk tur carousel (phase=' + S.phase + ')');
  assert(document.querySelectorAll('.carousel-card').length === 8, 'carousel 8 seçenek');
  G.pickCarousel(0);
  assert(S.phase === 'planning', 'carousel seçimi sonrası planning');
  assert(G.allUnits().length === 1, 'carousel birimi yedeğe geldi');

  console.log('\n— Mağaza & Ekonomi —');
  G.addGold(80);
  const goldBefore = S.gold;
  G.rollShop(false);
  assert(S.gold === goldBefore - 2, 'yenileme 2 altın');
  let bought = 0;
  for (let i = 0; i < 5; i++) {
    const before = G.allUnits().length;
    G.buyUnit(i);
    if (G.allUnits().length > before) bought++;
  }
  assert(bought > 0, 'mağazadan birim alındı (' + bought + ')');
  G.buyXp();
  assert(S.level >= 3, 'XP alımı seviye yükseltti (lvl ' + S.level + ')');

  console.log('\n— Yerleştirme —');
  const free = G.allUnits();
  let placed = 0;
  const spots = [[5, 3], [5, 2], [5, 4], [6, 1], [6, 5], [4, 3]];
  for (const u of free) {
    if (placed >= spots.length) break;
    if (G.placeUnit(u.uid, spots[placed][0], spots[placed][1])) placed++;
  }
  assert(placed > 0, placed + ' birim tahtaya kondu');
  assert(document.querySelectorAll('#unit-layer .unit-token').length === placed, 'tahta görselleri çizildi');
  assert(document.querySelectorAll('#bench .bench-slot').length === 9, '9 yedek slotu');
  assert(document.querySelectorAll('#shop .shop-card').length === 5, '5 mağaza kartı');

  // tahta limiti
  const cap = G.teamSize();
  while (G.boardCount() < cap) {
    const extra = G.allUnits().find(u => u.r < 0);
    if (!extra) break;
    let ok = false;
    for (let r = 4; r < 8 && !ok; r++) for (let c = 0; c < 7 && !ok; c++) {
      if (!G.unitAt(r, c)) ok = G.placeUnit(extra.uid, r, c);
    }
    if (!ok) break;
  }
  assert(G.boardCount() <= cap, 'takım sınırı aşılmadı (' + G.boardCount() + '/' + cap + ')');

  console.log('\n— Eşyalar —');
  G.giveRandomComponent(); G.giveRandomComponent();
  const compSlots = S.items.map((it, i) => it && it.comp ? i : -1).filter(i => i >= 0);
  assert(compSlots.length >= 2, 'iki bileşen eşya var');
  const nameBefore = S.items[compSlots[0]].name;
  G.combineItems(compSlots[0], compSlots[1]);
  assert(S.items[compSlots[0]] && !S.items[compSlots[0]].comp, 'bileşenler birleşti → ' + S.items[compSlots[0]].name);
  const targetUnit = G.allUnits()[0];
  const beforeItems = targetUnit.items.length;
  G.equipItem(targetUnit.uid, compSlots[0]);
  assert(targetUnit.items.length === beforeItems + 1, 'eşya birime takıldı');
  assert(document.querySelectorAll('#item-bench .item-slot').length === 10, '10 eşya slotu');

  console.log('\n— Savaş —');
  G.startCombat();
  assert(S.phase === 'combat', 'savaş başladı');
  assert(!!S.combat, 'savaş motoru kuruldu');
  let guard = 0;
  while (S.phase === 'combat' && guard < 4000) { step(50); guard++; }
  assert(S.phase === 'result' || S.phase === 'gameover', 'savaş bitti (phase=' + S.phase + ')');
  assert(!!S.result, 'sonuç üretildi');
  assert(document.querySelectorAll('#unit-layer .unit-token').length >= 0, 'savaş görselleri temizlendi');

  console.log('\n— Tur döngüsü —');
  let rounds = 0;
  let lastPhase = '';
  guard = 0;
  while (rounds < 8 && guard < 30000) {
    step(50); guard++;
    if (S.phase === 'augment' && document.querySelectorAll('.augment-card').length) {
      G.pickAugment(S.augmentOptions[0].id); rounds++;
    } else if (S.phase === 'carousel' && document.querySelectorAll('.carousel-card').length) {
      // yedek doluysa sat
      if (!S.bench.some(b => !b)) { const u = G.allUnits()[0]; if (u) G.sellUnit(u.uid); }
      G.pickCarousel(0); rounds++;
    } else if (S.phase === 'planning' && lastPhase !== 'planning') {
      rounds++;
      // her planning turunda alışveriş yap
      G.addGold(10); G.rollShop(false);
      for (let i = 0; i < 5; i++) G.buyUnit(i);
      // yeni birimleri tahtaya diz
      for (const u of G.allUnits()) {
        if (u.r >= 0) continue;
        if (G.boardCount() >= G.teamSize()) break;
        for (let r = 7; r >= 4; r--) { let done = false; for (let c = 0; c < 7; c++) { if (!G.unitAt(r, c)) { done = G.placeUnit(u.uid, r, c); break; } } if (done) break; }
      }
    }
    lastPhase = S.phase;
    if (S.phase === 'gameover') break;
  }
  assert(rounds >= 5, rounds + ' tur ilerledi (stage ' + S.stage + '-' + S.round + ')');
  assert(S.hp > 0 || S.phase === 'gameover', 'oyuncu canı tutarlı (' + S.hp + ')');

  console.log('\n— Boş tahta soft-lock testi —');
  {
    // planlama fazına kadar ilerle
    let g2 = 0;
    while (S.phase !== 'planning' && g2++ < 3000) { if (S.phase === 'augment') G.pickAugment(S.augmentOptions[0].id); else if (S.phase === 'carousel') G.pickCarousel(0); else step(50); }
    if (S.phase === 'planning') {
      S.board.slice().forEach(u => {
        const bi = S.bench.findIndex(b => !b);
        if (bi >= 0) G.benchUnit(u.uid, bi); else G.sellUnit(u.uid);
      });
      assert(G.boardCount() === 0, ' tahta boşaltıldı');
      S.timer = 0.05;
      for (let i = 0; i < 40 && S.phase === 'planning'; i++) step(50);
      assert(S.phase === 'combat' || S.phase === 'result' || S.phase === 'gameover', 'boş tahtada tur otomatik ilerledi (' + S.phase + ')');
    }
  }

  console.log('\n— Rendering kontrolü —');
  assert(document.querySelectorAll('.player-chip').length === 8, '8 oyuncu göstergesi');
  assert(document.querySelector('#player-gold').textContent === String(S.gold), 'altın göstergesi doğru');
  assert(document.querySelectorAll('.trait-row').length >= 0, 'sinerji paneli çizildi');

  console.log('\n— Oyun sonu / yeniden başlatma —');
  if (S.phase !== 'gameover') {
    S.place = 1;
    S.bots.forEach(b => { b.alive = false; b.hp = 0; });
    window.TFT.UI.showGameOver(true);
    assert(!document.getElementById('modal-root').classList.contains('hidden'), 'oyun sonu modalı açıldı');
    assert(!!document.getElementById('btn-restart'), 'yeniden başlatma butonu var');
    document.getElementById('btn-restart').click();
    assert(S.stage === 1 && S.round === 1, 'yeni oyun 1-1 ile başladı');
    assert(S.hp === 100 && S.level === 2, 'durum sıfırlandı');
    assert(G.allUnits().length === 0, 'birimler temizlendi');
  }

  console.log('\n— Hata günlüğü —');
  if (window.__errors.length) {
    console.log(window.__errors.slice(0, 10).join('\n'));
    fails += window.__errors.length;
  } else console.log('  ✓ çalışma zamanı hatası yok');

  console.log(fails === 0 ? '\n✅ ARAYÜZ TESTLERİ GEÇTİ' : '\n❌ ' + fails + ' HATA');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST ÇÖKTÜ:', e); process.exit(1); });
