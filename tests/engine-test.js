// Basit headless motor testi:  node tests/engine-test.js
const fs = require('fs');
global.window = {};
global.document = undefined;
eval(fs.readFileSync(__dirname + '/../src/data.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/../src/combat.js', 'utf8'));
const { DATA, Combat, Hex } = window.TFT;

let fails = 0;
const assert = (c, m) => { if (!c) { console.log('❌ ' + m); fails++; } };

// hex mesafesi
assert(Hex.hexDist({r:4,c:0},{r:4,c:1}) === 1, 'komsu mesafe 1');
assert(Hex.hexDist({r:0,c:0},{r:0,c:6}) === 6, 'ayni satir mesafe');
assert(Hex.neighbors(0,0).length === 2, 'kose komsu sayisi');
// komsuluk simetrisi + mesafe tutarliligi
for (let r = 0; r < 8; r++) for (let c = 0; c < 7; c++) {
  for (const n of Hex.neighbors(r, c)) {
    assert(Hex.hexDist({r,c},n) === 1, 'komsu mesafesi 1 degil');
    assert(Hex.neighbors(n.r,n.c).some(x => x.r===r && x.c===c), 'komsuluk simetrik degil');
  }
}
assert(Hex.neighbors(3,3).length === 6, 'orta komsu sayisi');

// tum sampiyonlar yetenekleriyle savassin
const champs = DATA.CHAMPS;
let tested = 0;
for (const champ of champs) {
  const ally = [{ champId: champ.id, star: 3, items: [], r: 5, c: 3 }];
  const enemy = [{ creep: 'golem', hpMult: 0.5, adMult: 0.05, r: 1, c: 3 }];
  const cb = new Combat(ally, enemy);
  let guard = 0;
  while (!cb.over && guard < 60 * 46) { cb.update(1 / 60); cb.drainEvents(); guard++; }
  assert(cb.over, champ.name + ' savas bitmedi');
  assert(cb.winner === 'ally', champ.name + ' dev golemi yenemedi');
  assert(cb.allyUnits[0].abilityCasts > 0, champ.name + ' yetenek kullanmadi');
  tested++;
}
console.log('✔ ' + tested + ' sampiyon test edildi');

// tum esya kombinasyonlari
const items = [];
for (const a of DATA.COMP_KEYS) for (const b of DATA.COMP_KEYS) {
  const it = DATA.buildItem(a, b);
  assert(it, 'esya yok: ' + a + '+' + b);
  if (it) items.push(it);
}
const uniq = {}; items.forEach(i => uniq[i.id] = 1);
assert(Object.keys(uniq).length === 36, '36 benzersiz tamamlanmis esya bekleniyordu, ' + Object.keys(uniq).length);
for (const it of items) {
  const cb = new Combat([{ champId: 'darius', star: 2, items: [it], r: 5, c: 3 }], [{ champId: 'ahri', star: 2, items: [], r: 2, c: 3 }]);
  let guard = 0;
  while (!cb.over && guard < 60 * 46) { cb.update(1 / 60); cb.drainEvents(); guard++; }
  assert(cb.over, it.name + ' savas bitmedi');
}
console.log('✔ ' + items.length + ' esya test edildi');

// tum traitler (her trait icin o trait'e sahip birimlerden dolu takim)
for (const t of Object.keys(DATA.TRAITS)) {
  const members = champs.filter(c => c.traits.includes(t)).slice(0, 6);
  const team = members.map((c, i) => ({ champId: c.id, star: 2, items: [], r: 5 + (i % 3), c: i % 7 }));
  const cb = new Combat(team, [{ champId: 'garen', star: 1, items: [], r: 2, c: 3 }]);
  let guard = 0;
  while (!cb.over && guard < 60 * 46) { cb.update(1 / 60); cb.drainEvents(); guard++; }
  assert(cb.over, t + ' savas bitmedi');
  assert(Object.keys(cb.traitInfo.ally.active).includes(t), t + ' aktif olmadi');
}
console.log('✔ ' + Object.keys(DATA.TRAITS).length + ' sinerji test edildi');

// PvE
for (const [k, w] of Object.entries(DATA.PVE_WAVES)) {
  const def = DATA.CREEP_DEFS[w.units];
  const team = [];
  for (let i = 0; i < def.count; i++) team.push({ creep: w.units, r: 2 + (i % 2), c: i % 7, hpMult: 1 });
  const cb = new Combat([{ champId: 'darius', star: 1, items: [], r: 4, c: 3 }], team);
  let guard = 0;
  while (!cb.over && guard < 60 * 46) { cb.update(1 / 60); cb.drainEvents(); guard++; }
  assert(cb.over, 'PvE ' + w.units + ' bitmedi');
}
console.log('✔ PvE dalgalari test edildi');

// 100 rastgele savas: kilitlenme yok
for (let i = 0; i < 100; i++) {
  const mk = side => {
    const n = 1 + Math.floor(Math.random() * 8);
    const arr = [];
    for (let j = 0; j < n; j++) {
      const ch = champs[Math.floor(Math.random() * champs.length)];
      arr.push({ champId: ch.id, star: 1 + Math.floor(Math.random() * 3), items: [], r: (side === 'a' ? 4 + j % 4 : (j % 4)), c: (j * 3) % 7 });
    }
    return arr;
  };
  const cb = new Combat(mk('a'), mk('e'));
  let guard = 0;
  while (!cb.over && guard < 60 * 46) { cb.update(1 / 60); cb.drainEvents(); guard++; }
  assert(cb.over, 'rastgele savas ' + i + ' bitmedi');
}
console.log('✔ 100 rastgele savas tamamlandi');

console.log(fails === 0 ? '\n✅ TUM TESTLER GECTI' : '\n❌ ' + fails + ' HATA');
process.exit(fails ? 1 : 0);
