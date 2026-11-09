/* Sinerji ve eşya etkilerinin doğruluğu: node tests/effects-test.js */
const fs = require('fs');
global.window = {};
eval(fs.readFileSync(__dirname + '/../src/data.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/../src/combat.js', 'utf8'));
const { DATA, Combat } = window.TFT;
const CH = DATA.CHAMP_BY_ID;

let fails = 0;
const ok = (c, m) => { if (c) console.log('  ✓ ' + m); else { console.log('  ❌ ' + m); fails++; } };
const near = (a, b, eps = 0.51) => Math.abs(a - b) <= eps;

function make(champIds, r0 = 5) {
  return champIds.map((id, i) => ({ champId: id, star: 2, items: [], r: r0 + (i % 3), c: (i * 2) % 7 }));
}
function fight(ally, enemy, ticks = 300) {
  const cb = new Combat(ally, enemy || [{ creep: 'golem', hpMult: 0.4, adMult: 0.02, r: 1, c: 3 }]);
  let guard = 0;
  while (!cb.over && guard < ticks) { cb.update(0.05); cb.drainEvents(); guard++; }
  return cb;
}
const unit = (cb, id, team = 'ally') => (team === 'ally' ? cb.allyUnits : cb.enemyUnits).find(u => u.champId === id);

console.log('\n— Sinerjiler —');
// SOYLU 3
{
  const cb = fight(make(['garen', 'lucian', 'vayne', 'darius']));
  const boosted = cb.allyUnits.filter(u => u.armor >= u.baseArmor + 30).length;
  ok(boosted >= 2, 'Soylu(3): rastgele dostlar +30 zırh (' + boosted + ' birim)');
}
// SOYLU 6
{
  const nobles = DATA.CHAMPS.filter(c => c.traits.includes('noble')).slice(0, 6).map(c => c.id);
  const cb = fight(make(nobles));
  ok(cb.allyUnits.every(u => u.armor >= u.baseArmor + 50), 'Soylu(6): tüm dostlar +50 zırh');
}
// İMPARATORLUK 2
{
  const cb = fight(make(['darius', 'katarina', 'garen']));
  const imps = cb.allyUnits.filter(u => u.traits.includes('imperial'));
  ok(imps.some(u => u.adPct >= 0.4), 'İmparatorluk(2): bir imparator +%40 AD');
}
// NİNJA 1
{
  const cb = fight(make(['zed', 'garen']));
  const zed = unit(cb, 'zed');
  ok(zed.adFlat >= 50 && zed.ap >= 50, 'Ninja(1): +50 AD / +50 AP');
}
// BOŞLUK 2
{
  const cb = fight(make(['kassadin', 'reksai', 'garen']));
  ok(cb.allyUnits.every(u => u.armorPen >= 0.3), 'Boşluk(2): %30 zırh yoksayma');
}
// BUZUL
{
  const cb = fight(make(['braum', 'sejuani', 'garen']));
  ok(cb.allyUnits.filter(u => u.traits.includes('glacial')).every(u => u.stunChance === 0.25), 'Buzul(2): %25 sersemletme');
}
// ŞEYTAN
{
  const cb = fight(make(['elise', 'varus', 'garen']));
  ok(cb.allyUnits.filter(u => u.traits.includes('demon')).every(u => u.manaBurn === 20), 'Şeytan(2): 20 mana yakma');
}
// EJDER
{
  const cb = fight(make(['shyvana', 'asol']));
  const shy = unit(cb, 'shyvana');
  ok(shy.magicRed >= 0.3 && shy.mr >= shy.baseMr + 40, 'Ejder(2): +40 direnç, %30 büyü azaltma');
}
// YORDLE
{
  const cb = fight(make(['tristana', 'poppy', 'lulu']));
  ok(cb.allyUnits.filter(u => u.traits.includes('yordle')).every(u => near(u.dodge, 0.3, 0.01)), 'Yordle(3): %30 kaçınma');
}
// VAHŞİ
{
  const cb = fight(make(['ahri', 'warwick', 'garen']));
  ok(cb.allyUnits.filter(u => u.traits.includes('wild')).every(u => u.asPct >= 0.25), 'Vahşi(2): +%25 saldırı hızı');
}
// ROBOT
{
  const cb = new Combat(make(['blitzcrank']), [{ creep: 'minion', r: 1, c: 3 }]);
  ok(cb.allyUnits[0].mana === cb.allyUnits[0].maxMana, 'Robot(1): tam mana ile başlar');
}
// SÜRGÜN
{
  const cb = new Combat(make(['yasuo']), [{ creep: 'minion', r: 1, c: 3 }]);
  ok(cb.allyUnits[0].shield >= 400, 'Sürgün(1): 400 kalkan');
}
// SUİKASTÇI
{
  const cb = fight(make(['zed', 'katarina', 'pyke', 'garen']));
  ok(cb.allyUnits.filter(u => u.traits.includes('assassin')).every(u => u.critDmg >= 1.7), 'Suikastçı(3): +%30 kritik hasar');
}
// KILIÇ USTASI
{
  const cb = fight(make(['garen', 'fiora', 'shen']));
  ok(cb.allyUnits.filter(u => u.traits.includes('blademaster')).every(u => u.bladeChance === 0.3), 'Kılıç Ustası(3): %30 ek saldırı');
}
// YUMRUK
{
  const cb = fight(make(['darius', 'warwick']));
  ok(cb.allyUnits.every(u => u.maxHp >= u.baseHp + 300 - 1), 'Yumruk(2): +300 can');
}
// SİLAHŞÖR
{
  const cb = fight(make(['lucian', 'tristana']));
  ok(cb.allyUnits.every(u => u.gunslingerExtra === 1), 'Silahşör(2): 1 ek hedef');
}
// ŞÖVALYE
{
  const cb = fight(make(['poppy', 'mordekaiser']));
  ok(cb.allyUnits.every(u => u.block === 15), 'Şövalye(2): 15 hasar blok');
}
// NİŞANCI
{
  const cb = fight(make(['vayne', 'varus']));
  ok(cb.allyUnits.filter(u => u.traits.includes('ranger')).every(u => u.asPct >= 0.35), 'Nişancı(2): +%35 saldırı hızı');
}
// BÜYÜCÜ
{
  const cb = fight(make(['ahri', 'kassadin', 'tf']));
  ok(cb.allyUnits.every(u => u.ap >= 25), 'Büyücü(3): tüm dostlar +25 AP');
}
// MUHAFIZ
{
  const cb = fight(make(['braum', 'leona']));
  ok(cb.allyUnits.some(u => u.shield >= 300), 'Muhafız(2): kalkan');
}
// ŞEKİL DEĞİŞTİREN
{
  const cb = fight(make(['nidalee', 'elise', 'shyvana']));
  ok(cb.allyUnits.filter(u => u.traits.includes('shapeshifter')).every(u => u.transformed), 'Şekil Değiştiren(3): dönüşüm');
}
// ELEMENTALİST
{
  const cb = fight(make(['kennen', 'brand', 'anivia']));
  ok(cb.allyUnits.some(u => u.creep === 'golemSummon'), 'Elementalist(3): Golem çağrıldı');
}

console.log('\n— Eşyalar —');
function withItem(id, itemSpecs) {
  const items = itemSpecs.map(spec => {
    const [a, b] = spec.split('+');
    return b ? DATA.buildItem(a, b) : { id: a, name: a, icon: '', stats: DATA.COMPONENTS[a].stats, comp: true };
  });
  const cb = new Combat([{ champId: id, star: 2, items, r: 5, c: 3 }],
    [{ creep: 'golem', hpMult: 0.3, adMult: 0.02, r: 1, c: 3 }]);
  return cb.allyUnits[0];
}
{
  const u = withItem('darius', ['belt+belt']);
  ok(u.maxHp >= u.baseHp + 500 - 1, "Warmog: +500 can (" + Math.round(u.maxHp) + ')');
}
{
  const u = withItem('ahri', ['rod+rod']);
  ok(u.ap >= 60 && u.magicAmp > 1.2, 'Rabadon: +60 AP ve %25 büyü güçlendirme');
}
{
  const u = withItem('ahri', ['tear+tear']);
  ok(u.startMana >= 40 && u.mana >= 40, 'Mavi Tılsım: +40 başlangıç manası');
}
{
  const u = withItem('lucian', ['bow+bow']);
  ok(u.range === CH.lucian.range + 1, 'Hızlı Ateş Topu: +1 menzil');
}
{
  const u = withItem('lucian', ['gloves+gloves']);
  ok(u.items.length === 3, "Hırsız Eldivenleri: 3 eşya (2 rastgele + kendisi)");
}
{
  const u = withItem('darius', ['bf+gloves']);
  ok(u.critDmg > 1.9, 'Sonsuz Kılıç: kritik hasarı artırdı');
}
{
  const u = withItem('darius', ['vest+vest']);
  ok(u.bramble === true, 'Böğürtlen Yeleği: yansıtma aktif');
}
{
  const u = withItem('darius', ['vest+gloves']);
  ok(u.specials.shroud === true, 'Sessizlik Örtüsü: rakip manasını azaltır');
}
{
  // Zefir: savaş başında düşman savaş dışı
  const it = DATA.buildItem('cloak', 'belt');
  const cb = new Combat([{ champId: 'darius', star: 2, items: [it], r: 5, c: 3 }],
    [{ champId: 'garen', star: 1, items: [], r: 2, c: 3 }, { champId: 'lucian', star: 1, items: [], r: 2, c: 4 }]);
  ok(cb.enemyUnits.some(u => u.banishT > 0), 'Zefir: bir düşman savaş dışı');
}
{
  // Locket: komşu dost kalkan
  const it = DATA.buildItem('rod', 'vest');
  const cb = new Combat([
    { champId: 'darius', star: 2, items: [it], r: 5, c: 3 },
    { champId: 'garen', star: 1, items: [], r: 5, c: 4 }
  ], [{ creep: 'minion', r: 2, c: 3 }]);
  ok(cb.allyUnits[1].shield >= 200, 'Solari Madalyonu: komşuya kalkan');
}
{
  // Guinsoo: saldırı başına saldırı hızı
  const it = DATA.buildItem('bow', 'rod');
  const cb = new Combat([{ champId: 'lucian', star: 2, items: [it], r: 5, c: 3 }],
    [{ creep: 'golem', hpMult: 1, adMult: 0.02, r: 2, c: 3 }]);
  const before = cb.effAS(cb.allyUnits[0]);
  for (let i = 0; i < 40; i++) { cb.update(0.05); cb.drainEvents(); }
  const after = cb.effAS(cb.allyUnits[0]);
  ok(after > before, 'Guinsoo: saldırı hızı yığılıyor (' + before.toFixed(2) + ' → ' + after.toFixed(2) + ')');
}
{
  // Morello: yetenek yakma
  const it = DATA.buildItem('rod', 'belt');
  const cb = new Combat([{ champId: 'ahri', star: 2, items: [it], r: 5, c: 3 }],
    [{ creep: 'golem', hpMult: 1, adMult: 0.02, r: 2, c: 3 }]);
  let burned = false, burnApplied = false;
  for (let i = 0; i < 600 && !cb.over; i++) {
    cb.update(0.05);
    cb.drainEvents().forEach(e => {
      if (e.type === 'damage' && e.dot) burned = true;
      if (e.type === 'damage' && e.ability) burnApplied = true;
    });
    if (cb.enemyUnits[0] && cb.enemyUnits[0].burnT > 0) burnApplied = true;
  }
  ok(burnApplied, 'Morellonomicon: yakma uygulandı');
  ok(burned, 'Morellonomicon: yakma hasarı işledi');
}
{
  // Quicksilver: sersemletme bağışıklığı
  const it = DATA.buildItem('cloak', 'gloves');
  const u = withItem('darius', ['cloak+gloves']);
  ok(u.quicksilver > 0, 'Cıva: kontrol bağışıklığı süresi');
}
{
  // Adalet Eli: rastgele buff uygulanıyor
  const u = withItem('darius', ['tear+gloves']);
  ok(u.adFlat >= 25 || u.lifesteal >= 0.25, 'Adalet Eli: rastgele buff uygulandı');
}
{
  // Guinsoo sınırı
  const it = DATA.buildItem('bow', 'rod');
  const cb = new Combat([{ champId: 'lucian', star: 2, items: [it], r: 5, c: 3 }],
    [{ creep: 'golem', hpMult: 3, adMult: 0.01, r: 2, c: 3 }]);
  for (let i = 0; i < 900; i++) { cb.update(0.05); cb.drainEvents(); }
  ok(cb.allyUnits[0].guinsooStacks <= 20, 'Guinsoo: 20 yığın sınırı (' + cb.allyUnits[0].guinsooStacks + ')');
}
{
  // Gargoyle: hedefleyen düşman başına zırh
  const it = DATA.buildItem('vest', 'cloak');
  const u = withItem('darius', ['vest+cloak']);
  ok(u.specials.gargoyle === true, 'Gargoyle Taşplaka: dinamik zırh');
}

console.log('\n— Savaş mekaniği —');
{
  // kalkan hasarı emer
  const cb = new Combat([{ champId: 'braum', star: 1, items: [], r: 5, c: 3 }], [{ creep: 'minion', r: 2, c: 3 }]);
  const u = cb.allyUnits[0];
  u.shield = 100;
  const hp0 = u.hp;
  cb.damage({ armorPen: 0, specials: {}, dmgMult: 1 }, u, 50, 'true', {});
  ok(u.hp === hp0, 'kalkan hasarı emiyor');
  ok(u.shield === 50, 'kalkan azaldı');
}
{
  // mana kazanımı
  const cb = new Combat([{ champId: 'ahri', star: 1, items: [], r: 5, c: 3 }], [{ creep: 'golem', hpMult: 2, adMult: 0.01, r: 2, c: 3 }]);
  const u = cb.allyUnits[0];
  for (let i = 0; i < 200; i++) { cb.update(0.05); cb.drainEvents(); }
  ok(u.abilityCasts > 0, 'mana dolunca yetenek kullanıldı');
}
{
  // ölüm ve savaş sonu
  const cb = new Combat([{ champId: 'darius', star: 3, items: [], r: 5, c: 3 }], [{ creep: 'minion', r: 2, c: 3 }]);
  let g = 0; while (!cb.over && g++ < 2000) { cb.update(0.05); cb.drainEvents(); }
  ok(cb.over && cb.winner === 'ally', 'savaş sonu ve kazanan doğru');
  ok(cb.enemyUnits.every(u => !u.alive), 'düşman birimleri öldü');
}

console.log(fails === 0 ? '\n✅ TÜM ETKİ TESTLERİ GEÇTİ' : '\n❌ ' + fails + ' HATA');
process.exit(fails ? 1 : 0);
