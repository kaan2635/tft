/* =====================================================================
   TFT ARENA — OFFLINE  |  combat.js
   Hex tabanlı, tamamen deterministik olmayan auto-battler simülasyonu.
   DOM'a bağımlı DEĞİLDİR (test edilebilir / sunucuda çalışabilir).
   ===================================================================== */
window.TFT = window.TFT || {};
(function () {
  'use strict';
  const TFT = window.TFT;
  const DATA = TFT.DATA;
  const CH = DATA.CHAMP_BY_ID;

  /* ---------------- HEX MATEMATİĞİ (odd-r offset) ---------------- */
  const COLS = 7, ROWS = 8;
  function toCube(h) {
    const x = h.c - (h.r - (h.r & 1)) / 2;
    const z = h.r; const y = -x - z;
    return { x, y, z };
  }
  function hexDist(a, b) {
    const A = toCube(a), B = toCube(b);
    return Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y), Math.abs(A.z - B.z));
  }
  function neighbors(r, c) {
    const even = (r % 2) === 0;
    const d = even
      ? [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]]
      : [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];
    const out = [];
    for (const [dc, dr] of d) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push({ r: nr, c: nc });
    }
    return out;
  }
  const key = (r, c) => r + ',' + c;

  /* ---------------- YARDIMCILAR ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random;
  const choose = arr => arr[Math.floor(rnd() * arr.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  let UID = 1;
  let mainCombat = null; // aura / global erişim için

  class Combat {
    constructor(allySpecs, enemySpecs, opts) {
      this.opts = opts || {};
      this.events = [];
      this.time = 0;
      this.over = false;
      this.winner = null;          // 'ally' | 'enemy' | 'draw'
      this.allyUnits = [];
      this.enemyUnits = [];
      this.occupancy = {};
      this.traitInfo = { ally: {}, enemy: {} };
      this.stage = this.opts.stage || 1;
      this.maxTime = this.opts.maxTime || 45;
      mainCombat = this;

      (allySpecs || []).forEach(s => this.spawnChamp(s, 'ally'));
      (enemySpecs || []).forEach(s => this.spawnChamp(s, 'enemy'));
      this.start();
    }

    /* ---------- birim üretimi ---------- */
    spawnChamp(spec, team) {
      let u;
      if (spec.creep) {
        const def = DATA.CREEP_DEFS[spec.creep];
        if (!def) return null;
        const mult = spec.hpMult || 1;
        u = {
          uid: UID++, team, creep: spec.creep, champId: null, name: def.name, icon: def.icon,
          cost: 0, star: 1, traits: [], items: [], ability: null, passive: null,
          baseHp: def.hp * mult, baseAd: def.ad * (spec.adMult || 1), baseAs: def.as,
          baseArmor: def.armor, baseMr: def.mr, baseRange: def.range,
          maxMana: 0, mana: 0, startMana: 0,
          r: spec.r, c: spec.c, fromR: spec.r, fromC: spec.c, moveT: 1
        };
      } else {
        const champ = CH[spec.champId];
        if (!champ) return null;
        const star = clamp(spec.star || 1, 1, 3);
        const sm = DATA.STAR_MULT;
        u = {
          uid: UID++, team, creep: null, champId: champ.id, name: champ.name, icon: champ.icon,
          cost: champ.cost, star, traits: champ.traits.slice(), items: [], ability: champ.ability,
          passive: champ.passive || null,
          baseHp: champ.hp * sm.hp[star - 1], baseAd: champ.ad * sm.ad[star - 1], baseAs: champ.as,
          baseArmor: champ.armor, baseMr: champ.mr, baseRange: champ.range,
          maxMana: champ.mana, mana: 0, startMana: 0,
          r: spec.r, c: spec.c, fromR: spec.r, fromC: spec.c, moveT: 1
        };
      }
      /* --- eşyalar --- */
      u.hpBonus = 0; u.adFlat = 0; u.adPct = 0; u.asFlat = 0; u.asPct = 0;
      u.ap = 0; u.armorFlat = 0; u.mrFlat = 0; u.crit = 0.25; u.critDmg = 1.4;
      u.armorPen = 0; u.dodge = 0; u.magicRed = 0; u.lifesteal = 0; u.spellVamp = 0;
      u.rangeBonus = 0; u.specials = {}; u.atkCount = 0; u.guinsoo = 0; u.titanStacks = 0;
      u.bramble = false; u.trapclaw = false; u.quicksilver = 0; u.edgeUsed = false;
      u.btUsed = false; u.redeemUsed = false; u.handOfJustice = 0; u.manaRegen = 0;
      u.stunT = 0; u.banishT = 0; u.slowT = 0; u.slowAmt = 0; u.tempAs = 0; u.tempAsT = 0;
      u.block = 0; u.burnT = 0; u.burnDmg = 0; u.gunslingerExtra = 0; u.bladeChance = 0;
      u.atkCd = rnd() * 0.3; u.moveCd = 0; u.castT = 0; u.target = null; u.retargetT = 0;
      u.casting = false; u.alive = true; u.shield = 0; u.shieldT = 0;
      u.dead = false; u.spawned = false; u.magicAmp = 1;
      u.dealtDamage = 0; u.takenDamage = 0; u.abilityCasts = 0;

      const items = (spec.items || []).slice(0, DATA.MAX_ITEMS_PER_UNIT);
      items.forEach(it => { if (it) { u.items.push(it); this.applyItem(u, it); } });

      // Thief's Gloves: savaş başında 2 rastgele tam eşya
      if (u.specials.thiefsgloves) {
        const pool = Object.keys(DATA.COMBINED).map(k => {
          const parts = k.split('+');
          return DATA.buildItem(parts[0], parts[1]);
        }).filter(it => it && it.special !== 'thiefsgloves');
        for (let i = 0; i < 2 && u.items.length < 3; i++) {
          const it = choose(pool);
          u.items.push(it); this.applyItem(u, it);
        }
      }

      if (team === 'ally' && this.opts.allyBuffs) {
        const b = this.opts.allyBuffs;
        u.hpBonus += b.hp || 0;
        u.ap += b.ap || 0;
        u.asPct += b.as || 0;
        u.adPct += b.adPct || 0;
        u.armorFlat += b.armor || 0;
        u.mrFlat += b.mr || 0;
      }

      u.maxHp = Math.max(1, u.baseHp + u.hpBonus);
      u.ad = u.baseAd + u.adFlat;
      u.as = u.baseAs;
      u.armor = u.baseArmor + u.armorFlat;
      u.mr = u.baseMr + u.mrFlat;
      u.range = u.baseRange + u.rangeBonus;
      u.maxMana = u.maxMana || 0;
      u.mana = Math.min(u.maxMana, u.startMana);
      u.hp = u.maxHp;

      u.teamUnits = (team === 'ally') ? this.allyUnits : this.enemyUnits;
      u.enemyUnits = (team === 'ally') ? this.enemyUnits : this.allyUnits;

      if (this.occupancy[key(u.r, u.c)]) {
        const free = this.findFreeHex(u.r, u.c, u.team);
        if (free) { u.r = free.r; u.c = free.c; u.fromR = free.r; u.fromC = free.c; }
      }
      this.occupancy[key(u.r, u.c)] = u;
      u.teamUnits.push(u);
      return u;
    }

    applyItem(u, it) {
      const s = it.stats || {};
      if (s.hp) u.hpBonus += s.hp;
      if (s.ad) u.adFlat += s.ad;
      if (s.as) u.asPct += s.as;
      if (s.ap) u.ap += s.ap;
      if (s.mana) u.startMana += s.mana;
      if (s.armor) u.armorFlat += s.armor;
      if (s.mr) u.mrFlat += s.mr;
      if (s.crit) u.crit += s.crit;
      if (!it.special) return;
      u.specials[it.special] = true;
      switch (it.special) {
        case 'rfc': u.rangeBonus += 1; break;
        case 'rabadon': u.magicAmp *= 1.25; break;
        case 'ie': u.critDmg += 0.6; break;
        case 'jeweled': u.spellCrit = true; break;
        case 'lastwhisper': u.armorPen = Math.max(u.armorPen, 0.7); break;
        case 'bloodthirster': u.lifesteal += 0.3; break;
        case 'gunblade': u.spellVamp += 0.3; break;
        case 'shojin': u.manaRegen += 8; break;
        case 'guinsoo': u.guinsoo = 1; break;
        case 'bramble': u.bramble = true; break;
        case 'trapclaw': u.trapclaw = true; break;
        case 'quicksilver': u.quicksilver = 12; break;
        case 'warmog': u.hpRegen = (u.hpRegen || 0) + 0.02; break;
        case 'dragonsclaw': u.hpRegen = (u.hpRegen || 0) + 0.02; break;
        case 'thiefsgloves': break;
        case 'handofjustice': u.handOfJustice = rnd() < 0.5 ? 1 : 2; break;
        case 'titans': break;
        default: break;
      }
    }

    findFreeHex(r, c, team) {
      for (let rad = 1; rad < 5; rad++) {
        for (let rr = 0; rr < ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            if (hexDist({ r, c }, { r: rr, c: cc }) !== rad) continue;
            if (this.occupancy[key(rr, cc)]) continue;
            if (team === 'ally' && rr < 4) continue;
            if (team === 'enemy' && rr > 3) continue;
            return { r: rr, c: cc };
          }
        }
      }
      return null;
    }

    /* ---------- SAVAŞ BAŞLANGICI ---------- */
    start() {
      this.applyTraits('ally');
      this.applyTraits('enemy');
      this.applyTeamItems('ally');
      this.applyTeamItems('enemy');
      this.elementalistGolem('ally');
      this.elementalistGolem('enemy');
      this.assassinJump('ally');
      this.assassinJump('enemy');

      // sinerji sonrası türetilmiş değerleri yenile
      [this.allyUnits, this.enemyUnits].forEach(team => team.forEach(u => {
        u.ad = (u.baseAd + u.adFlat);
        u.armor = u.baseArmor + u.armorFlat;
        u.mr = u.baseMr + u.mrFlat;
        u.range = u.baseRange + u.rangeBonus;
      }));

      [this.allyUnits, this.enemyUnits].forEach(team => team.forEach(u => {
        u.maxHp = Math.max(1, Math.round(u.maxHp));
        u.hp = u.maxHp;
        u.ad = Math.max(1, u.ad);
        u.as = clamp(u.as, 0.2, 5);
        if (u.specials.robot || (u.traits.includes && u.traits.includes('robot') && u.traitRobotFullMana)) u.mana = u.maxMana;
      }));

      // Zefir: rastgele düşmanı savaş dışı bırak
      [['ally', 'enemy'], ['enemy', 'ally']].forEach(([side, other]) => {
        const units = side === 'ally' ? this.allyUnits : this.enemyUnits;
        const foes = other === 'ally' ? this.allyUnits : this.enemyUnits;
        units.forEach(u => {
          if (u.specials.zephyr) {
            const t = foes.filter(f => f.alive && !f.banishT);
            if (t.length) { const v = choose(t); v.banishT = 6; v.banished = true; }
          }
          if (u.specials.shroud) {
            foes.forEach(f => { f.mana = Math.max(0, f.mana - 20); });
          }
        });
      });
      this.events.push({ type: 'start' });
    }

    /* ---------- SİNERJİLER ---------- */
    computeTraits(units) {
      const counts = {};
      units.forEach(u => {
        (u.traits || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      });
      const active = {};
      Object.keys(counts).forEach(t => {
        const def = DATA.TRAITS[t]; if (!def) return;
        let tier = 0;
        def.tiers.forEach((tt, i) => { if (counts[t] >= tt.n) tier = i + 1; });
        if (tier > 0) active[t] = tier;
      });
      return { counts, active };
    }

    applyTraits(side) {
      const units = side === 'ally' ? this.allyUnits : this.enemyUnits;
      const info = this.computeTraits(units);
      this.traitInfo[side] = info;
      const A = info.active;
      const byTrait = t => units.filter(u => (u.traits || []).includes(t));
      const all = () => units.filter(u => u.alive);

      // SOYLU
      if (A.noble) {
        const targets = A.noble >= 2 ? all() : shuffle(all()).slice(0, 3);
        const amt = A.noble >= 2 ? 50 : 30;
        targets.forEach(u => { u.armorFlat += amt; u.mrFlat += amt; });
      }
      // İMPARATORLUK
      if (A.imperial) {
        const imps = byTrait('imperial');
        if (A.imperial >= 2) imps.forEach(u => { u.adPct += 0.7; });
        else if (imps.length) { const u = choose(imps); u.adPct += 0.4; }
      }
      // NİNJA
      if (A.ninja) {
        const nins = byTrait('ninja');
        if (A.ninja >= 2) nins.forEach(u => { u.adFlat += 70; u.ap += 70; });
        else if (nins.length) { const u = nins[0]; u.adFlat += 50; u.ap += 50; }
      }
      // BOŞLUK
      if (A.void) {
        const pen = A.void >= 2 ? 0.6 : 0.3;
        units.forEach(u => { u.armorPen = Math.max(u.armorPen, pen); });
        if (A.void >= 2) byTrait('void').forEach(u => { u.dmgMult = 1.25; });
      }
      // BUZUL
      if (A.glacial) {
        const ch = [0, 0.25, 0.4, 0.6][A.glacial] || 0.25;
        byTrait('glacial').forEach(u => { u.stunChance = ch; });
      }
      // ŞEYTAN
      if (A.demon) {
        byTrait('demon').forEach(u => { u.manaBurn = [0, 20, 35, 60][A.demon] || 20; });
      }
      // EJDER
      if (A.dragon) {
        byTrait('dragon').forEach(u => { u.armorFlat += 40; u.mrFlat += 40; u.magicRed += 0.3; });
      }
      // YORDLE
      if (A.yordle) {
        const dodge = A.yordle >= 2 ? 0.55 : 0.3;
        byTrait('yordle').forEach(u => { u.dodge += dodge; });
      }
      // VAHŞİ
      if (A.wild) {
        byTrait('wild').forEach(u => { u.asPct += A.wild >= 2 ? 0.5 : 0.25; });
        if (A.wild >= 2) units.forEach(u => { u.asPct += 0.2; });
      }
      // ROBOT
      if (A.robot) byTrait('robot').forEach(u => { u.startMana = u.maxMana; });
      // SÜRGÜN
      if (A.exile) byTrait('exile').forEach(u => { u.startShield = (u.startShield || 0) + 400; });
      // SUİKASTÇI
      if (A.assassin) {
        const cd = A.assassin >= 2 ? 0.7 : 0.3;
        byTrait('assassin').forEach(u => { u.critDmg += cd; u.isAssassin = true; });
      }
      // KILIÇ USTASI
      if (A.blademaster) {
        const chance = A.blademaster >= 3 ? 0.8 : A.blademaster >= 2 ? 0.55 : 0.3;
        const extra = A.blademaster >= 3 ? 3 : A.blademaster >= 2 ? 2 : 1;
        byTrait('blademaster').forEach(u => { u.bladeChance = chance; u.bladeExtra = extra; });
      }
      // YUMRUK
      if (A.brawler) {
        const hp = A.brawler >= 2 ? 700 : 300;
        byTrait('brawler').forEach(u => { u.maxHp += hp; });
      }
      // SİLAHŞÖR
      if (A.gunslinger) {
        const extra = A.gunslinger >= 2 ? 2 : 1;
        const mult = A.gunslinger >= 2 ? 0.6 : 0.5;
        byTrait('gunslinger').forEach(u => { u.gunslingerExtra = extra; u.gunslingerMult = mult; });
      }
      // ŞÖVALYE
      if (A.knight) units.forEach(u => { u.block += A.knight >= 2 ? 35 : 15; });
      // NİŞANCI
      if (A.ranger) {
        const b = A.ranger >= 2 ? 0.75 : 0.35;
        byTrait('ranger').forEach(u => { u.asPct += b; });
      }
      // BÜYÜCÜ
      if (A.sorcerer) {
        const ap = A.sorcerer >= 2 ? 60 : 25;
        units.forEach(u => { u.ap += ap; });
      }
      // MUHAFIZ
      if (A.guardian) {
        byTrait('guardian').forEach(u => {
          u.startShield = (u.startShield || 0) + 300;
          units.forEach(o => {
            if (o !== u && hexDist(u, o) <= 1) o.startShield = (o.startShield || 0) + 300;
          });
        });
      }
      // ŞEKİL DEĞİŞTİREN
      if (A.shapeshifter) byTrait('shapeshifter').forEach(u => { u.maxHp *= 1.6; u.transformed = true; });
    }

    applyTeamItems(side) {
      const units = side === 'ally' ? this.allyUnits : this.enemyUnits;
      units.forEach(u => {
        if (u.specials.zeke) {
          units.forEach(o => { if (o !== u && hexDist(u, o) <= 1) o.asPct += 0.25; });
        }
        if (u.specials.locket) {
          units.forEach(o => { if (o !== u && hexDist(u, o) <= 1) o.startShield = (o.startShield || 0) + 220; });
        }
        if (u.specials.chalice) {
          units.forEach(o => { if (o !== u && hexDist(u, o) <= 1) o.ap += 25; });
        }
        if (u.specials.ionic) {
          units.forEach(o => {
            if (o.team !== u.team && hexDist(u, o) <= 2) o.mrShred = Math.max(o.mrShred || 0, 0.4);
          });
        }
        if (u.specials.frozenheart) {
          units.forEach(o => {
            if (o.team !== u.team && hexDist(u, o) <= 2) { o.auraSlow = Math.max(o.auraSlow || 0, 0.3); }
          });
        }
      });
      // Adalet Eli: rastgele buff
      units.forEach(u => {
        if (u.handOfJustice === 1) { u.adFlat += 25; u.ap += 25; }
        else if (u.handOfJustice === 2) { u.lifesteal += 0.25; }
      });
      // başlangıç kalkanları
      units.forEach(u => {
        if (u.startShield) u.shield = (u.shield || 0) + u.startShield;
        u.mana = Math.min(u.maxMana, u.startMana + (u.items || []).reduce((a, it) => a + ((it.stats && it.stats.mana) || 0), 0) * 0);
      });
    }

    elementalistGolem(side) {
      const info = this.traitInfo[side];
      if (!info || !info.active.elementalist) return;
      const units = side === 'ally' ? this.allyUnits : this.enemyUnits;
      // serbest hex bul (orta saflarda)
      let spot = null;
      const rows = side === 'ally' ? [4, 5, 6, 7] : [3, 2, 1, 0];
      for (const r of rows) { for (let c = 0; c < COLS; c++) { if (!this.occupancy[key(r, c)]) { spot = { r, c }; break; } } if (spot) break; }
      if (!spot) return;
      const g = this.spawnChamp({ creep: 'golemSummon', r: spot.r, c: spot.c }, side);
      if (g) { g.name = 'Golem'; g.hp = g.maxHp; g.spawned = true; g.isSummon = true; }
    }

    assassinJump(side) {
      const units = side === 'ally' ? this.allyUnits : this.enemyUnits;
      const foes = side === 'ally' ? this.enemyUnits : this.allyUnits;
      if (!foes.length) return;
      units.forEach(u => {
        if (!u.isAssassin) return;
        // en uzak düşmanı bul
        let far = foes[0], best = -1;
        foes.forEach(f => { const d = hexDist(u, f); if (d > best) { best = d; far = f; } });
        if (!far) return;
        const cands = neighbors(far.r, far.c).filter(h => !this.occupancy[key(h.r, h.c)] &&
          (side === 'ally' ? h.r >= 0 : h.r <= 7));
        if (!cands.length) return;
        const dest = candidates => candidates.sort((a, b) => hexDist(a, far) - hexDist(b, far))[0];
        const d = dest(cands);
        delete this.occupancy[key(u.r, u.c)];
        u.r = d.r; u.c = d.c; u.fromR = d.r; u.fromC = d.c;
        this.occupancy[key(d.r, d.c)] = u;
      });
    }

    /* ---------- EFEKTİF DEĞERLER ---------- */
    effAS(u) {
      let as = (u.baseAs) * (1 + u.asPct + (u.guinsooStacks || 0) * 0.05) + u.asFlat;
      if (u.tempAsT > 0) as *= (1 + u.tempAs);
      if (u.slowT > 0) as *= (1 - u.slowAmt);
      if (u.auraSlow) as *= (1 - u.auraSlow);
      return clamp(as, 0.2, 5);
    }
    effAD(u) { return Math.max(1, u.ad * (1 + u.adPct) * (1 + (u.titansStacks || 0) * 0.02)); }
    effArmor(u) {
      let a = u.armor + (u.titansStacks || 0) * 2;
      if (u.specials.gargoyle) a += 12 * this.enemyUnits.filter(e => e.alive && e.target === u).length;
      return a;
    }
    effMR(u) { let m = u.mr; if (u.mrShred) m *= (1 - u.mrShred); return Math.max(0, m); }
    effRange(u) { return u.range; }
    apMult(u) { return (1 + u.ap / 100) * (u.magicAmp || 1); }

    /* ---------- HEDEF SEÇİMİ ---------- */
    acquire(e, dt) {
      let t = e.target;
      e.retargetT -= dt;
      if (!t || !t.alive || t.banishT > 0) { t = null; }
      if (!t || e.retargetT <= 0) {
        let best = null, bd = 99;
        e.enemyUnits.forEach(f => {
          if (!f.alive || f.banishT > 0) return;
          const d = hexDist(e, f);
          if (d < bd) { bd = d; best = f; }
        });
        if (best) t = best;
        e.retargetT = 0.4;
      }
      e.target = t;
      return t;
    }

    /* ---------- ANA DÖNGÜ ---------- */
    update(dt) {
      if (this.over) return;
      dt = Math.min(dt, 0.05);
      this.time += dt;
      const all = this.allyUnits.concat(this.enemyUnits);

      all.forEach(u => {
        if (!u.alive) return;
        u.atkCd -= dt;
        u.moveCd -= dt;
        if (u.stunT > 0) { u.stunT -= dt; u.stunned = true; } else u.stunned = false;
        if (u.banishT > 0) { u.banishT -= dt; u.banished = true; if (u.banishT <= 0) u.banished = false; }
        if (u.tempAsT > 0) u.tempAsT -= dt;
        if (u.slowT > 0) u.slowT -= dt;
        if (u.quicksilver > 0) u.quicksilver -= dt;
        if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0; }
        if (u.moveT < 1) u.moveT = Math.min(1, u.moveT + dt / 0.30);
        if (u.hpRegen && u.hp < u.maxHp) this.heal(u, u.maxHp * u.hpRegen * dt, false);
        if (u.burnT > 0) {
          u.burnT -= dt;
          this.damage(u, u, u.burnDmg * dt, 'true', { silent: true, dot: true });
        }
        if (u.specials.sunfire) {
          u.sunfireCd = (u.sunfireCd || 0) - dt;
          if (u.sunfireCd <= 0) {
            u.sunfireCd = 1;
            this.enemyUnits.forEach(f => {
              if (!f.alive) return;
              if (hexDist(u, f) <= 1) this.damage(u, f, f.maxHp * 0.02, 'true', { silent: true, dot: true });
            });
          }
        }
      });

      // pasif manası / casting
      all.forEach(e => {
        if (!e.alive || e.banished) return;
        if (e.castT > 0) { e.castT -= dt; if (e.castT <= 0) { e.casting = false; } return; }
        if (e.stunT > 0) return;
        const t = this.acquire(e, dt);
        if (!t) return;
        const dist = hexDist(e, t);
        if (e.maxMana > 0 && e.mana >= e.maxMana && !e.casting) { this.cast(e, t); return; }
        if (dist <= this.effRange(e)) {
          if (e.atkCd <= 0) this.attack(e, t);
        } else {
          if (e.moveCd <= 0 && e.moveT >= 1) this.moveToward(e, t);
        }
      });

      // ölüm sonrası kontrol
      const aAlive = this.allyUnits.some(u => u.alive);
      const eAlive = this.enemyUnits.some(u => u.alive);
      if (!aAlive || !eAlive) {
        this.over = true;
        this.winner = !aAlive && !eAlive ? 'draw' : (!eAlive ? 'ally' : 'enemy');
        this.events.push({ type: 'end', winner: this.winner });
        return;
      }
      if (this.time >= this.maxTime) {
        this.over = true;
        const aPct = this.allyUnits.reduce((s, u) => s + (u.alive ? u.hp / u.maxHp : 0), 0);
        const ePct = this.enemyUnits.reduce((s, u) => s + (u.alive ? u.hp / u.maxHp : 0), 0);
        this.winner = aPct >= ePct ? 'ally' : 'enemy';
        this.events.push({ type: 'end', winner: this.winner, timeout: true });
      }
    }

    moveToward(u, t) {
      const opts = neighbors(u.r, u.c).filter(h => !this.occupancy[key(h.r, h.c)]);
      if (!opts.length) { u.moveCd = 0.35; return; }
      const cur = hexDist(u, t);
      let best = null, bd = 99;
      opts.forEach(h => {
        const d = hexDist(h, t);
        // düşman bölgesine ilerlemeyi teşvik et, kalabalıktan kaçın
        let score = d + (d === cur ? 0.35 : 0) + rnd() * 0.05;
        if (d < bd) { bd = score; best = h; }
      });
      if (!best) return;
      delete this.occupancy[key(u.r, u.c)];
      u.fromR = u.r; u.fromC = u.c;
      u.r = best.r; u.c = best.c; u.moveT = 0;
      u.moveCd = 0.34;
      this.occupancy[key(best.r, best.c)] = u;
    }

    /* ---------- SALDIRI ---------- */
    attack(u, t) {
      u.atkCd = 1 / this.effAS(u);
      u.atkCount = (u.atkCount || 0) + 1;
      if (u.guinsoo) u.guinsooStacks = Math.min(20, (u.guinsooStacks || 0) + 1);
      if (u.maxMana > 0) u.mana = Math.min(u.maxMana, u.mana + 10 + (u.manaRegen || 0));
      this.events.push({ type: 'attack', from: u, to: t, ranged: u.range > 1 });
      this.basicHit(u, t, 1);

      // Silahşör ek hedefler
      if (u.gunslingerExtra) {
        const others = u.enemyUnits.filter(f => f.alive && f !== t && f.banishT <= 0)
          .sort((a, b) => hexDist(u, a) - hexDist(u, b)).slice(0, u.gunslingerExtra);
        others.forEach(o => this.basicHit(u, o, u.gunslingerMult || 0.5));
      }
      // Runaan ek bolt
      if (u.specials.runaan) {
        const o = u.enemyUnits.filter(f => f.alive && f !== t && f.banishT <= 0)
          .sort((a, b) => hexDist(u, a) - hexDist(u, b))[0];
        if (o) { this.events.push({ type: 'runaan', from: u, to: o }); this.basicHit(u, o, 0.6); }
      }
      // Statikk
      if (u.specials.statikk && u.atkCount % 3 === 0) {
        const targets = u.enemyUnits.filter(f => f.alive && f.banishT <= 0)
          .sort((a, b) => hexDist(u, a) - hexDist(u, b)).slice(0, 3);
        targets.forEach(f => {
          this.events.push({ type: 'statikk', from: u, to: f });
          this.damage(u, f, 90, 'magic', { ability: false });
        });
      }
      if (u.bladeChance && rnd() < u.bladeChance) {
        this.events.push({ type: 'blade', from: u });
        for (let i = 0; i < (u.bladeExtra || 1); i++) this.basicHit(u, t, 0.6);
      }
      // Vayne pasifi
      if (u.passive === 'silver' && u.atkCount % 3 === 0) {
        const dmg = t.maxHp * 0.10 + u.baseAd * 0.5;
        this.events.push({ type: 'silver', from: u, to: t });
        this.damage(u, t, dmg, 'true', {});
      }
    }

    basicHit(u, t, mult) {
      if (!t || !t.alive) return;
      // kaçınma
      if (t.dodge && rnd() < t.dodge) {
        this.events.push({ type: 'dodge', unit: t });
        return;
      }
      let dmg = this.effAD(u) * mult;
      let crit = false;
      if (rnd() < u.crit) { crit = true; dmg *= u.critDmg; }
      // glacial
      if (u.stunChance && rnd() < u.stunChance && t.stunT <= 0 && !(t.quicksilver > 0)) {
        t.stunT = Math.max(t.stunT, 1.5);
        this.events.push({ type: 'stun', unit: t });
      }
      // şeytan mana yakma
      if (u.manaBurn && t.maxMana > 0) {
        const burn = Math.min(u.manaBurn, t.mana);
        t.mana -= burn;
        if (burn > 0) this.damage(u, t, burn, 'true', { silent: true });
      }
      // tokmak yavaşlatma
      if (u.specials.mallet) { t.slowT = 3; t.slowAmt = Math.max(t.slowAmt || 0, 0.3); }
      this.damage(u, t, dmg, 'physical', { crit });
      // trap claw
      if (t.trapclaw && !t.trapclawUsed) {
        t.trapclawUsed = true;
        if (!(u.quicksilver > 0)) { u.stunT = Math.max(u.stunT, 1.5); this.events.push({ type: 'stun', unit: u }); }
      }
      // bramble
      if (t.bramble) this.damage(t, u, 80, 'magic', { silent: true });
    }

    /* ---------- HASAR ---------- */
    damage(src, tgt, raw, type, opts) {
      opts = opts || {};
      if (!tgt || !tgt.alive || tgt.banishT > 0) return 0;
      let dmg = raw;
      if (type === 'physical') {
        const ar = this.effArmor(tgt) * (1 - (src.armorPen || 0));
        dmg *= 100 / (100 + ar);
        dmg -= (tgt.block || 0);
      } else if (type === 'magic') {
        const mr = this.effMR(tgt);
        dmg *= 100 / (100 + mr);
        dmg *= (1 - (tgt.magicRed || 0));
        dmg -= (tgt.block || 0);
      }
      if (src.dmgMult) dmg *= src.dmgMult;
      if (src.specials.giantslayer && tgt.maxHp >= 1500) dmg *= 1.25;
      if (opts.crit) dmg *= 1;
      dmg = Math.max(1, Math.round(dmg));
      if (opts.ability) src.dealtDamage = (src.dealtDamage || 0) + dmg;

      // kalkan emme
      let toHp = dmg;
      if (tgt.shield > 0) {
        const absorbed = Math.min(tgt.shield, toHp);
        tgt.shield -= absorbed; toHp -= absorbed;
        this.events.push({ type: 'shieldHit', unit: tgt, amount: absorbed });
      }
      if (!opts.silent) {
        tgt.takenDamage = (tgt.takenDamage || 0) + dmg;
        if (src.dealtDamage !== undefined && !opts.ability) src.dealtDamage += dmg;
      }
      this.events.push({
        type: 'damage', from: src, unit: tgt, amount: dmg, dmgType: type,
        crit: !!opts.crit, ability: !!opts.ability, dot: !!opts.dot, hp: toHp
      });
      // mana kazanımı
      if (tgt.maxMana > 0) tgt.mana = Math.min(tgt.maxMana, tgt.mana + Math.min(15, dmg * 0.02));
      // titan / edge / bt / redemption / gargoyle tetikleri
      if (tgt.specials.titans) tgt.titansStacks = Math.min(20, (tgt.titansStacks || 0) + 1);
      if (tgt.specials.edge && !tgt.edgeUsed && tgt.hp / tgt.maxHp < 0.4) {
        tgt.edgeUsed = true; tgt.banishT = Math.max(tgt.banishT, 1.5);
        this.events.push({ type: 'stealth', unit: tgt });
      }
      if (tgt.specials.bloodthirster && !tgt.btUsed && tgt.hp / tgt.maxHp < 0.4) {
        tgt.btUsed = true; tgt.shield += Math.round(tgt.maxHp * 0.3);
        this.events.push({ type: 'shield', unit: tgt, amount: Math.round(tgt.maxHp * 0.3) });
      }
      if (tgt.specials.redemption && !tgt.redeemUsed && tgt.hp / tgt.maxHp < 0.3) {
        tgt.redeemUsed = true;
        tgt.teamUnits.forEach(a => { if (a.alive) this.heal(a, 300); });
        this.events.push({ type: 'redemption', unit: tgt });
      }
      // can emme
      if (src.lifesteal && toHp > 0) this.heal(src, dmg * src.lifesteal, true);
      if (opts.ability && src.spellVamp) this.heal(src, dmg * src.spellVamp, true);

      tgt.hp -= toHp;
      if (tgt.hp <= 0) this.kill(tgt, src);
      return dmg;
    }

    heal(u, amount, silent) {
      if (!u.alive) return;
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + amount);
      const diff = u.hp - before;
      if (diff > 0 && !silent) this.events.push({ type: 'heal', unit: u, amount: Math.round(diff) });
    }

    kill(u, src) {
      if (!u.alive) return;
      u.alive = false; u.hp = 0; u.dead = true;
      delete this.occupancy[key(u.r, u.c)];
      this.events.push({ type: 'death', unit: u, killer: src });
      // İntikam: eşyalar düşmez, sadece görsel
    }

    /* ---------- YETENEKLER ---------- */
    cast(u, t) {
      const ab = u.ability;
      if (!ab) { u.mana = 0; return; }
      u.mana = 0;
      u.casting = true; u.castT = 0.3;
      u.abilityCasts = (u.abilityCasts || 0) + 1;
      if (u.specials.bluebuff) u.mana = Math.min(u.maxMana, u.mana + 20);
      if (u.specials.archangel) u.ap += 20;
      const mult = this.apMult(u);
      const starIdx = Math.max(0, Math.min(2, (u.star || 1) - 1));
      const baseDmg = ab.dmg ? (ab.dmg[starIdx] || 0) : 0;
      const dmg = Math.round(baseDmg * mult);
      const mk = (target, amount, kind) => {
        if (!target || !target.alive) return;
        let a = amount;
        let crit = false;
        if (u.spellCrit && rnd() < u.crit) { crit = true; a *= (1.4 + (u.critDmg - 1.4)); }
        this.damage(u, target, a, kind || ab.dmgType || 'magic', { ability: true, crit });
        if (ab.burn) { target.burnT = 5; target.burnDmg = target.maxHp * ab.burn / 5; }
        if (u.specials.morello) { target.burnT = 5; target.burnDmg = Math.max(target.burnDmg || 0, target.maxHp * 0.02); }
      };
      const healSelf = amt => this.heal(u, amt);
      this.events.push({ type: 'cast', unit: u, ability: ab, target: t });

      const radiusUnits = (center, rad) => u.enemyUnits.filter(e => e.alive && e.banishT <= 0 && hexDist(center, e) <= rad);
      const allies = u.teamUnits.filter(a => a.alive);
      const lowestAlly = () => allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const lowestEnemy = () => u.enemyUnits.filter(e => e.alive && e.banishT <= 0).sort((a, b) => a.hp - b.hp)[0];

      switch (ab.type) {
        case 'single': {
          if (!t || !t.alive) break;
          let amt = dmg;
          if (ab.isolated) {
            const near = u.enemyUnits.filter(e => e.alive && e !== t && hexDist(e, t) <= 1).length;
            if (near === 0) amt = Math.round(amt * ab.isolated);
          }
          if (ab.bonusMaxHp) amt += Math.round(t.maxHp * ab.bonusMaxHp);
          mk(t, amt);
          if (ab.stun && !(t.quicksilver > 0)) t.stunT = Math.max(t.stunT, ab.stun);
          if (ab.burnMana && t.maxMana) t.mana = Math.max(0, t.mana - ab.burnMana);
          if (ab.shred) t.mrShred = Math.max(t.mrShred || 0, ab.shred);
          if (ab.lifesteal) healSelf(amt * ab.lifesteal);
          if (ab.shieldSelf) this.addShield(u, ab.shieldSelf);
          if (ab.as) this.buffAS(u, ab.as, ab.duration || 4);
          if (ab.knockback) {
            const free = neighbors(t.r, t.c).filter(h => !this.occupancy[key(h.r, h.c)]);
            if (free.length) {
              const dest = free.sort((a, b) => hexDist(a, u) - hexDist(b, u)).pop();
              delete this.occupancy[key(t.r, t.c)];
              t.r = dest.r; t.c = dest.c; t.moveT = 0; t.fromR = dest.r; t.fromC = dest.c;
              this.occupancy[key(dest.r, dest.c)] = t;
            }
          }
          break;
        }
        case 'aoe': {
          let center = t;
          if (ab.at === 'farthest') {
            center = u.enemyUnits.filter(e => e.alive).sort((a, b) => hexDist(u, b) - hexDist(u, a))[0] || t;
          } else if (ab.at === 'self' || ab.radius >= 7) {
            center = u;
          }
          if (!center) break;
          this.events.push({ type: 'aoe', center, radius: ab.radius || 1, kind: ab.stun ? 'frost' : 'magic' });
          radiusUnits(center, ab.radius || 1).forEach(e => {
            mk(e, dmg);
            if (ab.stun && !(e.quicksilver > 0)) e.stunT = Math.max(e.stunT, ab.stun);
          });
          if (ab.shieldSelf) this.addShield(u, ab.shieldSelf);
          if (ab.heal) healSelf(dmg * ab.heal * 0.33);
          break;
        }
        case 'nova': {
          this.events.push({ type: 'aoe', center: u, radius: ab.radius || 1, kind: 'magic' });
          let hits = 0;
          radiusUnits(u, ab.radius || 1).forEach(e => {
            mk(e, dmg); hits++;
            if (ab.stun && !(e.quicksilver > 0)) e.stunT = Math.max(e.stunT, ab.stun);
          });
          if (ab.heal) healSelf(dmg * ab.heal * Math.max(1, hits) * 0.35);
          if (ab.shieldSelf) this.addShield(u, ab.shieldSelf);
          break;
        }
        case 'heal': {
          const target = ab.self ? u : (lowestAlly() || u);
          this.heal(target, dmg);
          this.events.push({ type: 'aoe', center: target, radius: 0, kind: 'heal' });
          if (ab.as) this.buffAS(target, ab.as, ab.duration || 4);
          if (ab.hpBuff) { target.maxHp += ab.hpBuff; target.hp += ab.hpBuff; }
          break;
        }
        case 'shield': {
          const n = ab.targets || 1;
          const targets = [u].concat(allies.filter(a => a !== u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, n - 1));
          targets.forEach(a => { this.addShield(a, dmg, ab.duration || 4); if (ab.armorBuff) a.armorFlat += ab.armorBuff; });
          if (n === 1) this.addShield(u, dmg, ab.duration || 4);
          break;
        }
        case 'buff': {
          if (ab.as) this.buffAS(u, ab.as, ab.duration || 4);
          if (ab.shield) this.addShield(u, ab.shield);
          if (ab.radius) {
            this.events.push({ type: 'aoe', center: u, radius: ab.radius, kind: 'heal' });
            radiusUnits(u, ab.radius).forEach(e => mk(e, dmg));
          }
          break;
        }
        case 'chain': {
          let cur = t || lowestEnemy();
          const hitSet = new Set();
          for (let i = 0; i < (ab.bounces || 3) && cur; i++) {
            if (hitSet.has(cur.uid)) {
              const nxt = u.enemyUnits.filter(e => e.alive && !hitSet.has(e.uid))[0];
              if (!nxt) break; cur = nxt;
            }
            hitSet.add(cur.uid);
            this.events.push({ type: 'chain', from: i === 0 ? u : cur, to: cur });
            mk(cur, dmg);
            const next = u.enemyUnits.filter(e => e.alive && !hitSet.has(e.uid))
              .sort((a, b) => hexDist(a, cur) - hexDist(b, cur))[0];
            cur = next;
          }
          break;
        }
        case 'execute': {
          const target = lowestEnemy() || t;
          if (target) {
            mk(target, dmg);
            if (ab.shieldSelf) this.addShield(u, ab.shieldSelf);
          }
          break;
        }
        case 'dash': {
          const target = lowestEnemy() || t;
          if (target) {
            const free = neighbors(target.r, target.c).filter(h => !this.occupancy[key(h.r, h.c)]);
            if (free.length) {
              const dest = free[0];
              delete this.occupancy[key(u.r, u.c)];
              u.r = dest.r; u.c = dest.c; u.fromR = dest.r; u.fromC = dest.c;
              this.occupancy[key(dest.r, dest.c)] = u;
            }
            this.events.push({ type: 'aoe', center: u, radius: 1, kind: 'magic' });
            radiusUnits(u, 1).forEach(e => mk(e, dmg));
            if (ab.shieldSelf) this.addShield(u, ab.shieldSelf);
          }
          break;
        }
        case 'drain': {
          this.events.push({ type: 'aoe', center: u, radius: ab.radius || 2, kind: 'magic' });
          let total = 0;
          radiusUnits(u, ab.radius || 2).forEach(e => { mk(e, dmg); total += dmg; });
          if (ab.heal) healSelf(total * ab.heal * 0.4);
          break;
        }
        default: {
          if (t) mk(t, dmg);
        }
      }
    }

    addShield(u, amount, duration) {
      u.shield += Math.round(amount);
      u.shieldT = Math.max(u.shieldT, duration || 999);
      this.events.push({ type: 'shield', unit: u, amount: Math.round(amount) });
    }
    buffAS(u, amt, dur) {
      u.tempAs = Math.max(u.tempAs, amt);
      u.tempAsT = Math.max(u.tempAsT, dur);
      this.events.push({ type: 'buff', unit: u, as: amt });
    }

    /* ---------- SONUÇ ---------- */
    survivors(team) {
      const arr = team === 'ally' ? this.allyUnits : this.enemyUnits;
      return arr.filter(u => u.alive);
    }
    aliveCount(team) { return this.survivors(team).length; }
    drainEvents() { const e = this.events; this.events = []; return e; }
  }

  TFT.Combat = Combat;
  TFT.Hex = { COLS, ROWS, hexDist, neighbors, key, toCube };
})();
