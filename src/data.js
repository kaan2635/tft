/* =====================================================================
   TFT ARENA — OFFLINE  |  data.js
   Şampiyonlar, sinerjiler, eşyalar, augmentlar, PvE dalgaları, sabitler
   ===================================================================== */
window.TFT = window.TFT || {};
(function () {
  'use strict';
  const TFT = window.TFT;

  /* ------------------------------------------------------------------
     SİNERJİLER
     ------------------------------------------------------------------ */
  const TRAITS = {
    noble: {
      name: 'Soylu', icon: '👑', kind: 'Köken', color: '#f2d489',
      tiers: [
        { n: 3, desc: 'Rastgele 3 dost birim +30 zırh ve +30 büyü direnci kazanır.' },
        { n: 6, desc: 'Tüm dost birimler +50 zırh ve +50 büyü direnci kazanır.' }
      ]
    },
    imperial: {
      name: 'İmparatorluk', icon: '🦅', kind: 'Köken', color: '#e05a5a',
      tiers: [
        { n: 2, desc: 'Rastgele 1 İmparatorluk birimi %40 saldırı gücü kazanır.' },
        { n: 4, desc: 'Tüm İmparatorluk birimleri %70 saldırı gücü kazanır.' }
      ]
    },
    ninja: {
      name: 'Ninja', icon: '🥷', kind: 'Köken', color: '#b06bff',
      tiers: [
        { n: 1, desc: 'Tek Ninja +50 saldırı gücü ve +50 yetenek gücü kazanır.' },
        { n: 4, desc: 'Tüm Ninjalar +70 saldırı gücü ve +70 yetenek gücü kazanır.' }
      ]
    },
    void: {
      name: 'Boşluk', icon: '🕳️', kind: 'Köken', color: '#a06bff',
      tiers: [
        { n: 2, desc: 'Tüm dost saldırıları düşman zırhının %30’unu yok sayar.' },
        { n: 4, desc: 'Zırhın %60’ı yok sayılır; Boşluk birimleri %25 fazla hasar verir.' }
      ]
    },
    glacial: {
      name: 'Buzul', icon: '❄️', kind: 'Köken', color: '#7fd8ff',
      tiers: [
        { n: 2, desc: 'Buzul saldırıları %25 ihtimalle 1.5 sn sersemletir.' },
        { n: 4, desc: 'Buzul saldırıları %40 ihtimalle 1.5 sn sersemletir.' },
        { n: 6, desc: 'Buzul saldırıları %60 ihtimalle 1.5 sn sersemletir.' }
      ]
    },
    demon: {
      name: 'Şeytan', icon: '😈', kind: 'Köken', color: '#ff6b9d',
      tiers: [
        { n: 2, desc: 'Şeytan saldırıları 20 mana yakar ve o kadar gerçek hasar verir.' },
        { n: 4, desc: 'Şeytan saldırıları 35 mana yakar ve o kadar gerçek hasar verir.' },
        { n: 6, desc: 'Şeytan saldırıları 60 mana yakar ve o kadar gerçek hasar verir.' }
      ]
    },
    dragon: {
      name: 'Ejder', icon: '🐉', kind: 'Köken', color: '#ff9b45',
      tiers: [
        { n: 2, desc: 'Ejderler +40 zırh/direnç kazanır ve büyü hasarının %30’unu yok sayar.' }
      ]
    },
    yordle: {
      name: 'Yordle', icon: '🍄', kind: 'Köken', color: '#8be0a0',
      tiers: [
        { n: 3, desc: 'Yordle birimler %30 ihtimalle saldırılardan kaçar.' },
        { n: 6, desc: 'Yordle birimler %55 ihtimalle saldırılardan kaçar.' }
      ]
    },
    pirate: {
      name: 'Korsan', icon: '🏴‍☠️', kind: 'Köken', color: '#e0b96b',
      tiers: [
        { n: 3, desc: 'Her tur sonunda +2 altın kazanırsın.' }
      ]
    },
    wild: {
      name: 'Vahşi', icon: '🐺', kind: 'Köken', color: '#c9a06b',
      tiers: [
        { n: 2, desc: 'Vahşi birimler %25 saldırı hızı kazanır.' },
        { n: 4, desc: 'Vahşi birimler %50, tüm dostlar %20 saldırı hızı kazanır.' }
      ]
    },
    robot: {
      name: 'Robot', icon: '🤖', kind: 'Köken', color: '#9fd0ff',
      tiers: [{ n: 1, desc: 'Robot tam mana ile savaşa başlar.' }]
    },
    exile: {
      name: 'Sürgün', icon: '🌪️', kind: 'Köken', color: '#a9c7ff',
      tiers: [{ n: 1, desc: 'Sürgün savaşa 400 kalkanla başlar.' }]
    },
    assassin: {
      name: 'Suikastçı', icon: '🗡️', kind: 'Sınıf', color: '#ff7b7b',
      tiers: [
        { n: 3, desc: 'Suikastçılar %30 kritik hasar kazanır ve düşman arka saflarına atlar.' },
        { n: 6, desc: 'Suikastçılar %70 kritik hasar kazanır ve arka safa atlar.' }
      ]
    },
    blademaster: {
      name: 'Kılıç Ustası', icon: '⚔️', kind: 'Sınıf', color: '#ffb454',
      tiers: [
        { n: 3, desc: '%30 ihtimalle saldırı 1 kez tekrarlanır.' },
        { n: 6, desc: '%55 ihtimalle saldırı 2 kez tekrarlanır.' },
        { n: 9, desc: '%80 ihtimalle saldırı 3 kez tekrarlanır.' }
      ]
    },
    brawler: {
      name: 'Yumruk', icon: '🥊', kind: 'Sınıf', color: '#e0a08a',
      tiers: [
        { n: 2, desc: 'Yumruk birimler +300 maksimum can kazanır.' },
        { n: 4, desc: 'Yumruk birimler +700 maksimum can kazanır.' }
      ]
    },
    elementalist: {
      name: 'Elementalist', icon: '🌊', kind: 'Sınıf', color: '#6bd0ff',
      tiers: [{ n: 3, desc: 'Savaş başında senin tarafında bir Golem savaşır.' }]
    },
    gunslinger: {
      name: 'Silahşör', icon: '🔫', kind: 'Sınıf', color: '#ffd166',
      tiers: [
        { n: 2, desc: 'Saldırılar 1 ek düşmana %50 hasar verir.' },
        { n: 4, desc: 'Saldırılar 2 ek düşmana %60 hasar verir.' }
      ]
    },
    knight: {
      name: 'Şövalye', icon: '🛡️', kind: 'Sınıf', color: '#a9c7ff',
      tiers: [
        { n: 2, desc: 'Tüm dostlar gelen her vuruşta 15 hasar bloklar.' },
        { n: 4, desc: 'Tüm dostlar gelen her vuruşta 35 hasar bloklar.' }
      ]
    },
    ranger: {
      name: 'Nişancı', icon: '🏹', kind: 'Sınıf', color: '#8be0a0',
      tiers: [
        { n: 2, desc: 'Nişancılar %35 saldırı hızı kazanır.' },
        { n: 4, desc: 'Nişancılar %75 saldırı hızı kazanır.' }
      ]
    },
    sorcerer: {
      name: 'Büyücü', icon: '🔮', kind: 'Sınıf', color: '#c9a0ff',
      tiers: [
        { n: 3, desc: 'Tüm dostlar +25 yetenek gücü kazanır.' },
        { n: 6, desc: 'Tüm dostlar +60 yetenek gücü kazanır.' }
      ]
    },
    guardian: {
      name: 'Muhafız', icon: '💠', kind: 'Sınıf', color: '#7fe0d0',
      tiers: [{ n: 2, desc: 'Muhafızlar ve komşu dostlar 300 kalkan kazanır.' }]
    },
    shapeshifter: {
      name: 'Şekil Değiştiren', icon: '🐾', kind: 'Sınıf', color: '#e0a06b',
      tiers: [{ n: 3, desc: 'Savaş başında +%60 maksimum can kazanır ve dönüşür.' }]
    }
  };

  /* ------------------------------------------------------------------
     ŞAMPİYONLAR
     type: single | aoe | nova | heal | shield | buff | chain | execute | dash | drain
     dmg: [1★,2★,3★]
     ------------------------------------------------------------------ */
  const CHAMPS = [
    /* ---------------- 1 ALTIN ---------------- */
    {
      id: 'darius', name: 'Darius', icon: '🪓', cost: 1, traits: ['imperial', 'brawler'],
      hp: 570, ad: 62, as: 0.65, armor: 35, mr: 30, range: 1, mana: 60,
      ability: { name: 'Kıyım', type: 'nova', dmg: [210, 320, 540], radius: 1, heal: 0.25, text: 'Çevresindeki düşmanlara hasar verir, her isabet için iyileşir.' }
    },
    {
      id: 'garen', name: 'Garen', icon: '⚔️', cost: 1, traits: ['noble', 'blademaster'],
      hp: 600, ad: 58, as: 0.6, armor: 40, mr: 30, range: 1, mana: 70,
      ability: { name: 'Yargı', type: 'nova', dmg: [190, 290, 500], radius: 1, text: 'Etrafında dönerek çevresindeki düşmanlara hasar verir.' }
    },
    {
      id: 'ahri', name: 'Ahri', icon: '🦊', cost: 1, traits: ['wild', 'sorcerer'],
      hp: 480, ad: 45, as: 0.7, armor: 20, mr: 20, range: 3, mana: 60,
      ability: { name: 'Aldatma Küresi', type: 'single', dmg: [210, 330, 620], text: 'Hedefine büyü hasarı verir.' }
    },
    {
      id: 'lucian', name: 'Lucian', icon: '🔫', cost: 1, traits: ['noble', 'gunslinger'],
      hp: 500, ad: 55, as: 0.75, armor: 25, mr: 20, range: 3, mana: 50,
      ability: { name: 'Acımasız Takip', type: 'single', dmg: [190, 280, 430], dmgType: 'physical', text: 'Hedefine iki hızlı atış yapar.' }
    },
    {
      id: 'tristana', name: 'Tristana', icon: '💥', cost: 1, traits: ['yordle', 'gunslinger'],
      hp: 500, ad: 52, as: 0.7, armor: 25, mr: 20, range: 3, mana: 60,
      ability: { name: 'Patlayıcı Yük', type: 'single', dmg: [220, 320, 540], text: 'Hedefine patlayıcı yük yerleştirip hasar verir.' }
    },
    {
      id: 'warwick', name: 'Warwick', icon: '🐺', cost: 1, traits: ['wild', 'brawler'],
      hp: 580, ad: 58, as: 0.65, armor: 30, mr: 30, range: 1, mana: 70,
      ability: { name: 'Sonsuz Zulüm', type: 'single', dmg: [170, 260, 460], lifesteal: 0.6, stun: 0.75, text: 'Hedefine atılır, hasar verir ve can çalar.' }
    },
    {
      id: 'kassadin', name: 'Kassadin', icon: '🔷', cost: 1, traits: ['void', 'sorcerer'],
      hp: 550, ad: 50, as: 0.6, armor: 30, mr: 35, range: 1, mana: 50,
      ability: { name: 'Cehennem Bıçağı', type: 'single', dmg: [190, 280, 470], burnMana: 30, text: 'Hedefine hasar verir ve manasını yakar.' }
    },
    {
      id: 'nidalee', name: 'Nidalee', icon: '🐆', cost: 1, traits: ['wild', 'shapeshifter'],
      hp: 520, ad: 50, as: 0.65, armor: 25, mr: 25, range: 3, mana: 60,
      ability: { name: 'İlkel Coşku', type: 'heal', dmg: [210, 320, 560], as: 0.4, duration: 5, text: 'En yaralı dostu iyileştirir ve saldırı hızı verir.' }
    },
    {
      id: 'vayne', name: 'Vayne', icon: '🏹', cost: 1, traits: ['noble', 'ranger'],
      hp: 480, ad: 50, as: 0.75, armor: 20, mr: 20, range: 3, mana: 60,
      passive: 'silver', ability: { name: 'Gümüş Oklar', type: 'single', dmg: [130, 190, 320], dmgType: 'true', bonusMaxHp: 0.08, text: 'Her 3. saldırı gerçek hasar verir.' }
    },
    {
      id: 'poppy', name: 'Poppy', icon: '🔨', cost: 1, traits: ['yordle', 'knight'],
      hp: 620, ad: 55, as: 0.6, armor: 45, mr: 30, range: 1, mana: 70,
      ability: { name: 'Demir Elçi', type: 'single', dmg: [170, 250, 420], stun: 1.5, text: 'Hedefini sersemletir ve hasar verir.' }
    },
    {
      id: 'elise', name: 'Elise', icon: '🕷️', cost: 1, traits: ['demon', 'shapeshifter'],
      hp: 520, ad: 48, as: 0.65, armor: 25, mr: 25, range: 2, mana: 60,
      ability: { name: 'Örümcek Formu', type: 'heal', dmg: [170, 260, 450], as: 0.5, duration: 6, text: 'Kendini iyileştirir ve saldırı hızı kazanır.' }
    },
    {
      id: 'tf', name: 'Twisted Fate', icon: '🃏', cost: 1, traits: ['pirate', 'sorcerer'],
      hp: 500, ad: 45, as: 0.65, armor: 20, mr: 25, range: 3, mana: 50,
      ability: { name: 'Kart Seç', type: 'single', dmg: [190, 290, 480], stun: 1, text: 'Rastgele bir kart atar; hasar ve kısa sersemletme.' }
    },
    {
      id: 'fiora', name: 'Fiora', icon: '🤺', cost: 1, traits: ['noble', 'blademaster'],
      hp: 550, ad: 60, as: 0.75, armor: 30, mr: 25, range: 1, mana: 50,
      ability: { name: 'Rioste', type: 'buff', dmg: [0, 0, 0], as: 0.6, duration: 4, shield: 200, text: 'Kalkan kazanır ve saldırı hızını artırır.' }
    },
    {
      id: 'mordekaiser', name: 'Mordekaiser', icon: '💀', cost: 1, traits: ['imperial', 'knight'],
      hp: 650, ad: 55, as: 0.55, armor: 40, mr: 30, range: 1, mana: 80,
      ability: { name: 'Yok Et', type: 'single', dmg: [230, 340, 600], shieldSelf: 150, text: 'Hedefine ağır hasar verir ve kalkan kazanır.' }
    },

    /* ---------------- 2 ALTIN ---------------- */
    {
      id: 'zed', name: 'Zed', icon: '🌑', cost: 2, traits: ['ninja', 'assassin'],
      hp: 650, ad: 65, as: 0.7, armor: 30, mr: 30, range: 1, mana: 50,
      ability: { name: 'Keskin Yıldız', type: 'chain', dmg: [200, 300, 540], bounces: 3, text: 'Hedefe ve yakındaki 2 düşmana hasar verir.' }
    },
    {
      id: 'katarina', name: 'Katarina', icon: '🗡️', cost: 2, traits: ['imperial', 'assassin'],
      hp: 600, ad: 55, as: 0.65, armor: 30, mr: 25, range: 1, mana: 60,
      ability: { name: 'Ölüm Lotusu', type: 'nova', dmg: [250, 375, 660], radius: 2, text: 'Geniş bir alanda çevresindeki düşmanlara hasar verir.' }
    },
    {
      id: 'blitzcrank', name: 'Blitzcrank', icon: '🤖', cost: 2, traits: ['robot', 'brawler'],
      hp: 700, ad: 60, as: 0.6, armor: 40, mr: 35, range: 1, mana: 60,
      ability: { name: 'Roket Kanca', type: 'single', dmg: [190, 290, 480], stun: 2, text: 'En uzak düşmanı çeker ve sersemletir.' }
    },
    {
      id: 'shen', name: 'Shen', icon: '🥋', cost: 2, traits: ['ninja', 'blademaster'],
      hp: 680, ad: 60, as: 0.65, armor: 45, mr: 35, range: 1, mana: 60,
      ability: { name: 'Birlik Ol', type: 'shield', dmg: [250, 350, 620], targets: 2, duration: 5, text: 'Kendine ve bir dosta kalkan verir.' }
    },
    {
      id: 'lulu', name: 'Lulu', icon: '🍄', cost: 2, traits: ['yordle', 'sorcerer'],
      hp: 550, ad: 45, as: 0.65, armor: 25, mr: 30, range: 3, mana: 60,
      ability: { name: 'Vahşi Büyüme', type: 'heal', dmg: [260, 380, 650], hpBuff: 300, duration: 6, text: 'En yaralı dostu iyileştirir ve can şişirir.' }
    },
    {
      id: 'varus', name: 'Varus', icon: '🏹', cost: 2, traits: ['demon', 'ranger'],
      hp: 580, ad: 60, as: 0.7, armor: 25, mr: 25, range: 4, mana: 60,
      ability: { name: 'Delici Ok', type: 'aoe', dmg: [230, 340, 600], radius: 1, text: 'Hedefine ve çevresine delici ok fırlatır.' }
    },
    {
      id: 'braum', name: 'Braum', icon: '🛡️', cost: 2, traits: ['glacial', 'guardian'],
      hp: 750, ad: 50, as: 0.55, armor: 50, mr: 35, range: 1, mana: 70,
      ability: { name: 'Kırılmaz', type: 'shield', dmg: [320, 460, 800], duration: 4, armorBuff: 30, text: 'Büyük bir kalkan kazanır ve zırhı artar.' }
    },
    {
      id: 'sejuani', name: 'Sejuani', icon: '🐗', cost: 2, traits: ['glacial', 'knight'],
      hp: 750, ad: 55, as: 0.55, armor: 45, mr: 35, range: 1, mana: 80,
      ability: { name: 'Buzul Hapishanesi', type: 'aoe', dmg: [160, 240, 420], radius: 1, stun: 1.5, text: 'Hedef bölgedeki düşmanları sersemletir.' }
    },
    {
      id: 'rengar', name: 'Rengar', icon: '🐯', cost: 2, traits: ['wild', 'assassin'],
      hp: 650, ad: 68, as: 0.7, armor: 30, mr: 30, range: 1, mana: 50,
      ability: { name: 'Av Heyecanı', type: 'dash', dmg: [250, 370, 650], text: 'En yaralı düşmana atlar ve ağır hasar verir.' }
    },
    {
      id: 'pyke', name: 'Pyke', icon: '🔱', cost: 2, traits: ['pirate', 'assassin'],
      hp: 600, ad: 62, as: 0.7, armor: 30, mr: 30, range: 1, mana: 50,
      ability: { name: 'Derinlerden Ölüm', type: 'single', dmg: [200, 300, 520], stun: 1.25, text: 'Hedefine vurur ve sersemletir.' }
    },
    {
      id: 'aatrox', name: 'Aatrox', icon: '🦇', cost: 2, traits: ['demon', 'blademaster'],
      hp: 700, ad: 65, as: 0.6, armor: 35, mr: 30, range: 1, mana: 60,
      ability: { name: 'Kara Uçuş', type: 'aoe', dmg: [250, 375, 660], radius: 1, heal: 0.2, text: 'Hedef bölgesine çarpar ve iyileşir.' }
    },
    {
      id: 'reksai', name: 'RekSai', icon: '🦂', cost: 2, traits: ['void', 'brawler'],
      hp: 720, ad: 62, as: 0.6, armor: 35, mr: 30, range: 1, mana: 60,
      ability: { name: 'Öfkeli Isırık', type: 'single', dmg: [200, 310, 540], dmgType: 'true', shred: 0.3, text: 'Gerçek hasar verir ve hedefin zırhını kırar.' }
    },
    {
      id: 'teemo', name: 'Teemo', icon: '🎯', cost: 2, traits: ['yordle', 'ranger'],
      hp: 520, ad: 50, as: 0.75, armor: 20, mr: 25, range: 3, mana: 50,
      ability: { name: 'Zehirli Atış', type: 'single', dmg: [180, 280, 480], burn: 0.06, text: 'Zehirli atış: hasar ve yakma etkisi.' }
    },

    /* ---------------- 3 ALTIN ---------------- */
    {
      id: 'veigar', name: 'Veigar', icon: '🔮', cost: 3, traits: ['yordle', 'sorcerer'],
      hp: 700, ad: 50, as: 0.6, armor: 25, mr: 30, range: 3, mana: 60,
      ability: { name: 'İlkel Patlama', type: 'execute', dmg: [340, 520, 950], text: 'En az canlı düşmana devasa büyü hasarı verir.' }
    },
    {
      id: 'ashe', name: 'Ashe', icon: '❄️', cost: 3, traits: ['glacial', 'ranger'],
      hp: 720, ad: 65, as: 0.7, armor: 25, mr: 25, range: 4, mana: 60,
      ability: { name: 'Büyülü Kristal Ok', type: 'aoe', dmg: [210, 320, 560], radius: 1, stun: 1.75, text: 'Buz oku fırlatır, alandaki düşmanları dondurur.' }
    },
    {
      id: 'draven', name: 'Draven', icon: '🪓', cost: 3, traits: ['imperial', 'blademaster'],
      hp: 750, ad: 70, as: 0.7, armor: 30, mr: 30, range: 3, mana: 50,
      ability: { name: 'Dönen Balta', type: 'single', dmg: [240, 360, 650], dmgType: 'physical', as: 0.25, text: 'Baltasını fırlatır ve saldırı hızı kazanır.' }
    },
    {
      id: 'khazix', name: "Kha'Zix", icon: '🦗', cost: 3, traits: ['void', 'assassin'],
      hp: 750, ad: 70, as: 0.7, armor: 35, mr: 30, range: 1, mana: 60,
      ability: { name: 'Lezzetlerini Tat', type: 'single', dmg: [280, 420, 760], isolated: 1.6, text: 'Yalnız kalan hedeflere çok daha fazla hasar verir.' }
    },
    {
      id: 'mf', name: 'Miss Fortune', icon: '💃', cost: 3, traits: ['pirate', 'gunslinger'],
      hp: 700, ad: 65, as: 0.7, armor: 25, mr: 25, range: 4, mana: 70,
      ability: { name: 'Kurşun Zamanı', type: 'nova', dmg: [300, 450, 800], radius: 3, text: 'Geniş konide tüm düşmanlara kurşun yağdırır.' }
    },
    {
      id: 'kennen', name: 'Kennen', icon: '⚡', cost: 3, traits: ['ninja', 'elementalist'],
      hp: 720, ad: 55, as: 0.65, armor: 30, mr: 35, range: 2, mana: 70,
      ability: { name: 'Kesici Kasırga', type: 'nova', dmg: [190, 290, 520], radius: 2, stun: 1.5, text: 'Çevresinde fırtına yaratır, düşmanları sersemletir.' }
    },
    {
      id: 'nautilus', name: 'Nautilus', icon: '⚓', cost: 3, traits: ['void', 'knight'],
      hp: 850, ad: 60, as: 0.55, armor: 50, mr: 40, range: 1, mana: 70,
      ability: { name: 'Derinlik Hücumu', type: 'single', dmg: [200, 300, 520], stun: 2.5, text: 'Hedefini uzun süre sersemletir.' }
    },
    {
      id: 'shyvana', name: 'Shyvana', icon: '🐲', cost: 3, traits: ['dragon', 'shapeshifter'],
      hp: 800, ad: 65, as: 0.6, armor: 40, mr: 40, range: 1, mana: 80,
      ability: { name: 'Ejder İnişi', type: 'nova', dmg: [260, 390, 690], radius: 1, shieldSelf: 250, text: 'Ejder formuna geçer, çevresine hasar verir.' }
    },
    {
      id: 'gp', name: 'Gangplank', icon: '🛢️', cost: 3, traits: ['pirate', 'blademaster'],
      hp: 780, ad: 68, as: 0.65, armor: 35, mr: 30, range: 1, mana: 60,
      ability: { name: 'Barut Fıçısı', type: 'aoe', dmg: [300, 450, 800], radius: 1, text: 'Fıçıyı patlatır, alandaki düşmanlara hasar verir.' }
    },
    {
      id: 'evelynn', name: 'Evelynn', icon: '💜', cost: 3, traits: ['demon', 'assassin'],
      hp: 700, ad: 60, as: 0.65, armor: 30, mr: 30, range: 1, mana: 60,
      ability: { name: 'Son Okşayış', type: 'execute', dmg: [300, 450, 820], shieldSelf: 200, text: 'En zayıf düşmanı infaz eder, kalkan kazanır.' }
    },
    {
      id: 'nunu', name: 'Nunu', icon: '⛄', cost: 3, traits: ['glacial', 'brawler'],
      hp: 820, ad: 58, as: 0.55, armor: 40, mr: 35, range: 1, mana: 70,
      ability: { name: 'Yut', type: 'single', dmg: [250, 375, 700], dmgType: 'true', heal: 0.5, text: 'Hedefini ısırır, gerçek hasar verir ve iyileşir.' }
    },

    /* ---------------- 4 ALTIN ---------------- */
    {
      id: 'asol', name: 'Aurelion Sol', icon: '🌟', cost: 4, traits: ['dragon', 'sorcerer'],
      hp: 900, ad: 60, as: 0.6, armor: 30, mr: 40, range: 3, mana: 100,
      ability: { name: 'Işığın Sesi', type: 'aoe', dmg: [400, 600, 1150], radius: 2, at: 'farthest', text: 'En uzak düşmana dev bir ışın gönderir.' }
    },
    {
      id: 'chogath', name: "Cho'Gath", icon: '👾', cost: 4, traits: ['void', 'brawler'],
      hp: 1000, ad: 70, as: 0.55, armor: 45, mr: 40, range: 1, mana: 80,
      ability: { name: 'Yarık', type: 'aoe', dmg: [300, 450, 820], radius: 2, stun: 1.5, text: 'Yeri yarar, geniş alanda sersemletir.' }
    },
    {
      id: 'leona', name: 'Leona', icon: '☀️', cost: 4, traits: ['noble', 'guardian'],
      hp: 900, ad: 60, as: 0.6, armor: 55, mr: 45, range: 1, mana: 70,
      ability: { name: 'Güneş Patlaması', type: 'aoe', dmg: [210, 320, 560], radius: 2, stun: 2, shieldSelf: 350, text: 'Güneş ışığı patlatır, düşmanları sersemletir.' }
    },
    {
      id: 'yasuo', name: 'Yasuo', icon: '🌪️', cost: 4, traits: ['exile', 'blademaster'],
      hp: 850, ad: 78, as: 0.8, armor: 35, mr: 30, range: 1, mana: 60,
      ability: { name: 'Son Nefes', type: 'single', dmg: [300, 450, 900], stun: 1.5, text: 'Hedefini havaya kaldırır ve keser.' }
    },
    {
      id: 'jinx', name: 'Jinx', icon: '🚀', cost: 4, traits: ['pirate', 'gunslinger'],
      hp: 800, ad: 70, as: 0.75, armor: 25, mr: 25, range: 4, mana: 70,
      ability: { name: 'Süper Mega Ölüm Roketi', type: 'aoe', dmg: [350, 525, 1000], radius: 1, at: 'farthest', text: 'En uzak düşmana roket atar, alanı yakar.' }
    },
    {
      id: 'gnar', name: 'Gnar', icon: '🦖', cost: 4, traits: ['yordle', 'shapeshifter'],
      hp: 850, ad: 68, as: 0.65, armor: 40, mr: 35, range: 1, mana: 70,
      ability: { name: 'GNAR!', type: 'nova', dmg: [260, 390, 710], radius: 2, stun: 2, shieldSelf: 300, text: 'Mega Gnar’a dönüşür ve herkesi savurur.' }
    },
    {
      id: 'akali', name: 'Akali', icon: '🌸', cost: 4, traits: ['ninja', 'assassin'],
      hp: 820, ad: 75, as: 0.75, armor: 35, mr: 30, range: 1, mana: 50,
      ability: { name: 'Kusursuz İnfaz', type: 'execute', dmg: [350, 525, 1050], text: 'En zayıf düşmana ölümcül hasar verir.' }
    },
    {
      id: 'pantheon', name: 'Pantheon', icon: '🛡️', cost: 4, traits: ['noble', 'guardian'],
      hp: 900, ad: 72, as: 0.65, armor: 45, mr: 40, range: 1, mana: 70,
      ability: { name: 'Büyük Yıldız Düşüşü', type: 'aoe', dmg: [320, 480, 860], radius: 2, shieldSelf: 300, text: 'Gökten düşer, alana hasar verir, kalkan kazanır.' }
    },
    {
      id: 'brand', name: 'Brand', icon: '🔥', cost: 4, traits: ['demon', 'elementalist'],
      hp: 800, ad: 50, as: 0.6, armor: 25, mr: 35, range: 4, mana: 80,
      ability: { name: 'Piroklazm', type: 'chain', dmg: [300, 450, 850], bounces: 5, burn: 0.04, text: 'Alev topu düşmanlar arasında zıplar.' }
    },

    /* ---------------- 5 ALTIN ---------------- */
    {
      id: 'kaisa', name: "Kai'Sa", icon: '🦋', cost: 5, traits: ['void', 'assassin'],
      hp: 950, ad: 80, as: 0.8, armor: 40, mr: 40, range: 2, mana: 70,
      ability: { name: 'Katil İçgüdüsü', type: 'dash', dmg: [420, 630, 1350], shieldSelf: 400, text: 'Arka safa atlar, kalkan kazanır ve patlama yaratır.' }
    },
    {
      id: 'swain', name: 'Swain', icon: '🦅', cost: 5, traits: ['demon', 'shapeshifter'],
      hp: 1000, ad: 70, as: 0.6, armor: 40, mr: 45, range: 2, mana: 100,
      ability: { name: 'Şeytani Yükseliş', type: 'drain', dmg: [400, 600, 1280], radius: 2, heal: 0.4, text: 'Şeytana dönüşür, çevresini emer ve iyileşir.' }
    },
    {
      id: 'anivia', name: 'Anivia', icon: '🧊', cost: 5, traits: ['glacial', 'elementalist'],
      hp: 950, ad: 55, as: 0.6, armor: 30, mr: 40, range: 4, mana: 80,
      ability: { name: 'Buzul Fırtınası', type: 'aoe', dmg: [500, 750, 1600], radius: 2, stun: 1.5, text: 'Dev bir buz fırtınası yaratır.' }
    },
    {
      id: 'karthus', name: 'Karthus', icon: '☠️', cost: 5, traits: ['void', 'sorcerer'],
      hp: 900, ad: 55, as: 0.6, armor: 30, mr: 40, range: 4, mana: 90,
      ability: { name: 'Requiem', type: 'aoe', dmg: [360, 560, 1250], radius: 7, at: 'self', text: 'Tüm düşmanlara ölüm şarkısı söyler.' }
    },
    {
      id: 'leesin', name: 'Lee Sin', icon: '🐉', cost: 5, traits: ['wild', 'blademaster'],
      hp: 1050, ad: 78, as: 0.7, armor: 50, mr: 45, range: 1, mana: 60,
      ability: { name: 'Ejder Öfkesi', type: 'single', dmg: [400, 600, 1250], stun: 2, knockback: true, text: 'Hedefini tekmeler, uzağa savurur ve sersemletir.' }
    },
    {
      id: 'kayle', name: 'Kayle', icon: '👼', cost: 5, traits: ['noble', 'blademaster'],
      hp: 950, ad: 70, as: 0.8, armor: 35, mr: 35, range: 2, mana: 70,
      ability: { name: 'İlahi Hüküm', type: 'buff', dmg: [300, 450, 900], as: 0.5, duration: 5, shield: 400, radius: 2, text: 'Kutsanır: kalkan, saldırı hızı ve çevresine hasar.' }
    }
  ];
  const CHAMP_BY_ID = {};
  CHAMPS.forEach(c => { CHAMP_BY_ID[c.id] = c; });

  /* ------------------------------------------------------------------
     EŞYALAR
     ------------------------------------------------------------------ */
  const COMPONENTS = {
    bf: { id: 'bf', name: 'B.F. Kılıcı', icon: '⚔️', stats: { ad: 15 }, desc: '+15 saldırı gücü' },
    bow: { id: 'bow', name: 'Kıvrık Yay', icon: '🏹', stats: { as: 0.15 }, desc: '+%15 saldırı hızı' },
    rod: { id: 'rod', name: 'Büyük Asa', icon: '🪄', stats: { ap: 20 }, desc: '+20 yetenek gücü' },
    tear: { id: 'tear', name: 'Gözyaşı', icon: '💧', stats: { mana: 15 }, desc: '+15 başlangıç manası' },
    vest: { id: 'vest', name: 'Zincir Zırh', icon: '🧱', stats: { armor: 20 }, desc: '+20 zırh' },
    cloak: { id: 'cloak', name: 'Negatron Pelerini', icon: '🧥', stats: { mr: 20 }, desc: '+20 büyü direnci' },
    belt: { id: 'belt', name: 'Dev Kemeri', icon: '🎗️', stats: { hp: 150 }, desc: '+150 can' },
    gloves: { id: 'gloves', name: 'Boks Eldiveni', icon: '🥊', stats: { crit: 0.2 }, desc: '+%20 kritik şansı' }
  };
  const COMP_KEYS = Object.keys(COMPONENTS);

  // key: alfabetik "a+b"
  const COMBINED = {
    'bf+bf': { name: 'Ölüm Kılıcı', icon: '🗡️', stats: { ad: 40 }, special: 'deathblade' },
    'bf+bow': { name: 'Dev Avcısı', icon: '🏹', stats: { ad: 15, as: 0.15 }, special: 'giantslayer' },
    'bf+rod': { name: 'Hextech Tüfeği', icon: '🔫', stats: { ad: 15, ap: 20 }, special: 'gunblade' },
    'bf+tear': { name: 'Shōjin Mızrağı', icon: '🔱', stats: { ad: 15, mana: 15 }, special: 'shojin' },
    'bf+vest': { name: 'Gece Kenarı', icon: '🌙', stats: { ad: 15, armor: 20 }, special: 'edge' },
    'bf+cloak': { name: 'Kan Emici', icon: '🩸', stats: { ad: 15, mr: 20 }, special: 'bloodthirster' },
    'bf+belt': { name: 'Zeke’nin Müjdesi', icon: '📯', stats: { ad: 15, hp: 150 }, special: 'zeke' },
    'bf+gloves': { name: 'Sonsuz Kılıç', icon: '⚡', stats: { ad: 15, crit: 0.2 }, special: 'ie' },

    'bow+bow': { name: 'Hızlı Ateş Topu', icon: '🎯', stats: { as: 0.3 }, special: 'rfc' },
    'bow+rod': { name: 'Guinsoo’nun Öfke Kılıcı', icon: '🔥', stats: { as: 0.15, ap: 20 }, special: 'guinsoo' },
    'bow+tear': { name: 'Statikk Hançeri', icon: '⚡', stats: { as: 0.15, mana: 15 }, special: 'statikk' },
    'bow+vest': { name: 'Titan’ın Kararlılığı', icon: '🗿', stats: { as: 0.15, armor: 20 }, special: 'titans' },
    'bow+cloak': { name: 'Runaan’ın Kasırgası', icon: '🌪️', stats: { as: 0.15, mr: 20 }, special: 'runaan' },
    'bow+belt': { name: 'Donmuş Tokmak', icon: '🧊', stats: { as: 0.15, hp: 150 }, special: 'mallet' },
    'bow+gloves': { name: 'Son Fısıltı', icon: '🔎', stats: { as: 0.15, crit: 0.2 }, special: 'lastwhisper' },

    'rod+rod': { name: 'Rabadon’un Ölüm Başlığı', icon: '🎩', stats: { ap: 60 }, special: 'rabadon' },
    'rod+tear': { name: 'Başmelek Asası', icon: '📘', stats: { ap: 20, mana: 15 }, special: 'archangel' },
    'rod+vest': { name: 'Demir Solari Madalyonu', icon: '🔆', stats: { ap: 20, armor: 20 }, special: 'locket' },
    'rod+cloak': { name: 'İyonik Kıvılcım', icon: '⚡', stats: { ap: 20, mr: 20 }, special: 'ionic' },
    'rod+belt': { name: 'Morellonomicon', icon: '📕', stats: { ap: 20, hp: 150 }, special: 'morello' },
    'rod+gloves': { name: 'Mücevherli Eldiven', icon: '💎', stats: { ap: 20, crit: 0.2 }, special: 'jeweled' },

    'tear+tear': { name: 'Mavi Tılsım', icon: '🔵', stats: { mana: 40 }, special: 'bluebuff' },
    'tear+vest': { name: 'Donmuş Yürek', icon: '💙', stats: { mana: 15, armor: 20 }, special: 'frozenheart' },
    'tear+cloak': { name: 'Güç Kadehi', icon: '🏆', stats: { mana: 15, mr: 20 }, special: 'chalice' },
    'tear+belt': { name: 'Kefaret', icon: '🕊️', stats: { mana: 15, hp: 150 }, special: 'redemption' },
    'tear+gloves': { name: 'Adalet Eli', icon: '⚖️', stats: { mana: 15, crit: 0.2 }, special: 'handofjustice' },

    'vest+vest': { name: 'Böğürtlen Yeleği', icon: '🌵', stats: { armor: 50 }, special: 'bramble' },
    'vest+cloak': { name: 'Gargoyle Taşplaka', icon: '🗿', stats: { armor: 20, mr: 20 }, special: 'gargoyle' },
    'vest+belt': { name: 'Güneş Ateşi Pelerini', icon: '☀️', stats: { armor: 20, hp: 250 }, special: 'sunfire' },
    'vest+gloves': { name: 'Sessizlik Örtüsü', icon: '🕸️', stats: { armor: 20, crit: 0.2 }, special: 'shroud' },

    'cloak+cloak': { name: 'Ejder Pençesi', icon: '🐉', stats: { mr: 50 }, special: 'dragonsclaw' },
    'cloak+belt': { name: 'Zefir', icon: '💨', stats: { mr: 20, hp: 150 }, special: 'zephyr' },
    'cloak+gloves': { name: 'Cıva', icon: '🧪', stats: { mr: 20, crit: 0.2 }, special: 'quicksilver' },

    'belt+belt': { name: 'Warmog Zırhı', icon: '❤️', stats: { hp: 500 }, special: 'warmog' },
    'belt+gloves': { name: 'Tuzak Pençesi', icon: '🪤', stats: { hp: 150, crit: 0.2 }, special: 'trapclaw' },

    'gloves+gloves': { name: 'Hırsız Eldivenleri', icon: '🧤', stats: { crit: 0.2 }, special: 'thiefsgloves' }
  };
  const COMP_ORDER = { bf: 0, bow: 1, rod: 2, tear: 3, vest: 4, cloak: 5, belt: 6, gloves: 7 };
  const itemKey = (a, b) => (COMP_ORDER[a] <= COMP_ORDER[b] ? a + '+' + b : b + '+' + a);
  function buildItem(id1, id2) {
    const k = itemKey(id1, id2);
    const c = COMBINED[k];
    if (!c) return null;
    return {
      id: k, name: c.name, icon: c.icon, special: c.special, completed: true,
      stats: Object.assign({}, c.stats),
      desc: statText(c.stats)
    };
  }
  function statText(s) {
    const parts = [];
    if (s.ad) parts.push('+' + s.ad + ' AP(saldırı)');
    if (s.as) parts.push('+%' + Math.round(s.as * 100) + ' saldırı hızı');
    if (s.ap) parts.push('+' + s.ap + ' yetenek gücü');
    if (s.mana) parts.push('+' + s.mana + ' başlangıç manası');
    if (s.armor) parts.push('+' + s.armor + ' zırh');
    if (s.mr) parts.push('+' + s.mr + ' büyü direnci');
    if (s.hp) parts.push('+' + s.hp + ' can');
    if (s.crit) parts.push('+%' + Math.round(s.crit * 100) + ' kritik');
    return parts.join(', ');
  }
  const SPECIAL_DESC = {
    deathblade: 'Aşırı saldırı gücü.', giantslayer: '1500+ canlı hedeflere %25 fazla hasar.',
    gunblade: 'Yetenek hasarının %30’u kadar iyileşir.', shojin: 'Saldırı başına +8 ek mana.',
    edge: 'Can %40’ın altına düşünce 1.5 sn görünmez olur.', bloodthirster: '%30 can çalma; ilk kez %40 can altında kalkan.',
    zeke: 'Komşu dostlara %25 saldırı hızı verir.', ie: 'Kritik vuruşlar +%60 fazla hasar verir.',
    rfc: '+1 menzil.', guinsoo: 'Her saldırıda kalıcı +%5 saldırı hızı (en fazla 20).',
    statikk: 'Her 3. saldırı 3 düşmana 90 büyü hasarı verir.', titans: 'Vuruş aldıkça +%2 saldırı gücü ve +2 zırh (20 kez).',
    runaan: 'Saldırılar 1 ek düşmana %60 hasar verir.', mallet: 'Saldırılar hedefin saldırı hızını %30 azaltır.',
    lastwhisper: 'Düşman zırhının %70’ini yok sayar.', rabadon: 'Yetenek gücü +%25 fazladan etki eder.',
    archangel: 'Her yetenek kullanımında +20 yetenek gücü.', locket: 'Komşu dostlara 220 kalkan verir.',
    ionic: '2 hex içindeki düşmanların büyü direncini %40 azaltır.', morello: 'Yetenek hasarı hedefi 5 sn yakar (%10 maks. can).',
    jeweled: 'Yetenekler kritik vurabilir.', bluebuff: 'Yetenek sonrası +20 mana kazanır.',
    frozenheart: '2 hex içindeki düşmanların saldırı hızını %30 azaltır.', chalice: 'Komşu dostlara +25 yetenek gücü verir.',
    redemption: 'Can %30’un altına düşünce tüm dostları 300 iyileştirir.', handofjustice: 'Rastgele: +25 saldırı gücü ya da %25 can çalma.',
    bramble: 'Saldırganlara 80 büyü hasarı verir.', gargoyle: 'Hedefleyen her düşman için +12 zırh/direnç.',
    sunfire: '1 hex içindeki düşmanları her saniye yakar.', dragonsclaw: '2 saniyede bir maks. canının %4’ünü iyileştirir.',
    zephyr: 'Savaş başında rastgele bir düşmanı 6 sn savaş dışı bırakır.', quicksilver: '12 sn boyunca kontrol etkilerine bağışık.',
    warmog: 'Saniyede maksimum canının %2’sini yeniler.', trapclaw: 'İlk saldırgını 1.5 sn sersemletir.',
    thiefsgloves: 'Savaş başında 2 rastgele tamamlanmış eşya verir.'
  };

  /* ------------------------------------------------------------------
     AUGMENTLAR
     ------------------------------------------------------------------ */
  const AUGMENTS = [
    { id: 'gold8', name: 'Altın Yağmuru', icon: '🪙', tier: 'Gümüş', desc: 'Hemen 10 altın kazan.', apply: g => g.addGold(10) },
    { id: 'item1', name: 'Hazine Sandığı', icon: '🎁', tier: 'Gümüş', desc: 'Rastgele 2 eşya bileşeni kazan.', apply: g => { g.giveRandomComponent(); g.giveRandomComponent(); } },
    { id: 'spoon', name: 'Şanslı Kaşık', icon: '🥄', tier: 'Altın', desc: 'Rastgele 1 tamamlanmış eşya kazan.', apply: g => g.giveRandomCompletedItem() },
    { id: 'ad', name: 'Demir Yumruk', icon: '💪', tier: 'Altın', desc: 'Tüm birimlerin +%12 saldırı gücü kazanır.', apply: g => g.addGlobalBuff('adPct', 0.12) },
    { id: 'ap', name: 'Büyü Ustası', icon: '🔮', tier: 'Altın', desc: 'Tüm birimler +25 yetenek gücü kazanır.', apply: g => g.addGlobalBuff('ap', 25) },
    { id: 'hp', name: 'Bereket', icon: '❤️', tier: 'Gümüş', desc: 'Tüm birimler +180 can kazanır.', apply: g => g.addGlobalBuff('hp', 180) },
    { id: 'as', name: 'Rüzgâr Gibi', icon: '💨', tier: 'Gümüş', desc: 'Tüm birimler +%15 saldırı hızı kazanır.', apply: g => g.addGlobalBuff('as', 0.15) },
    { id: 'tank', name: 'Demir Duvarlar', icon: '🧱', tier: 'Gümüş', desc: 'Tüm birimler +20 zırh ve büyü direnci kazanır.', apply: g => g.addGlobalBuff('armor', 20) },
    { id: 'interest', name: 'Tüccar', icon: '💰', tier: 'Altın', desc: 'Faiz üst sınırı 5 yerine 7 altın olur.', apply: g => g.addGlobalBuff('interestCap', 2) },
    { id: 'odds', name: 'Şanslı Yıldız', icon: '🍀', tier: 'Altın', desc: 'Mağaza oranları 1 seviye yüksek sayılır.', apply: g => g.addGlobalBuff('shopOdds', 1) },
    { id: 'team', name: 'Geniş Kadro', icon: '👥', tier: 'Altın', desc: 'Takım boyutu +1 artar.', apply: g => g.addGlobalBuff('teamSize', 1) },
    { id: 'heal', name: 'Diriliş', icon: '✨', tier: 'Gümüş', desc: '15 can yenilenir.', apply: g => g.healPlayer(15) },
    { id: 'reroll', name: 'Kumarbaz', icon: '🎲', tier: 'Gümüş', desc: 'Yenileme maliyeti 1 altına düşer.', apply: g => g.addGlobalBuff('rerollDiscount', 1) },
    { id: 'xp', name: 'Akademi', icon: '📚', tier: 'Gümüş', desc: 'Hemen 12 XP kazan.', apply: g => g.addXp(12) },
    { id: 'goldround', name: 'Yatırımcı', icon: '📈', tier: 'Altın', desc: 'Her tur sonunda +2 altın kazan.', apply: g => g.addGlobalBuff('goldPerRound', 2) }
  ];

  /* ------------------------------------------------------------------
     PvE DALGALARI
     ------------------------------------------------------------------ */
  const PVE_WAVES = {
    1: { name: 'Minionlar', units: 'minion', gold: 3, drop: 0.35 },
    2: { name: 'Kruglar', units: 'krug', gold: 4, drop: 0.45 },
    3: { name: 'Kurtlar', units: 'wolf', gold: 5, drop: 0.55 },
    4: { name: 'Raptorlar', units: 'raptor', gold: 6, drop: 0.6 },
    5: { name: 'Golem', units: 'golem', gold: 8, drop: 0.7 },
    6: { name: 'Kadim Ejder', units: 'dragon', gold: 10, drop: 0.8 }
  };
  const CREEP_DEFS = {
    minion: { name: 'Minion', icon: '👾', hp: 480, ad: 40, as: 0.6, armor: 10, mr: 10, range: 1, count: 4, spread: 'front', scale: true },
    krug: { name: 'Krug', icon: '🪨', hp: 1150, ad: 65, as: 0.55, armor: 30, mr: 20, range: 1, count: 3, spread: 'front', scale: true },
    wolf: { name: 'Kurt', icon: '🐺', hp: 1450, ad: 85, as: 0.8, armor: 25, mr: 25, range: 1, count: 4, spread: 'front', scale: true },
    raptor: { name: 'Raptor', icon: '🦅', hp: 1250, ad: 100, as: 1.0, armor: 20, mr: 20, range: 1, count: 5, spread: 'front', scale: true },
    golem: { name: 'Golem', icon: '🗿', hp: 6500, ad: 200, as: 0.7, armor: 60, mr: 60, range: 1, count: 1, spread: 'front', scale: true },
    dragon: { name: 'Kadim Ejder', icon: '🐲', hp: 16000, ad: 380, as: 0.8, armor: 80, mr: 80, range: 2, count: 1, spread: 'front', scale: true },
    golemSummon: { name: 'Golem', icon: '🗿', hp: 1900, ad: 95, as: 0.65, armor: 40, mr: 40, range: 1, count: 1 }
  };

  /* ------------------------------------------------------------------
     SABİTLER
     ------------------------------------------------------------------ */
  const XP_TABLE = { 2: 2, 3: 6, 4: 10, 5: 20, 6: 36, 7: 48, 8: 76, 9: 84 };
  const XP_COST = 4; const XP_PER_BUY = 4;
  const REROLL_COST = 2;
  // seviyeye göre 1/2/3/4/5 maliyet oranları
  const SHOP_ODDS = {
    1: [100, 0, 0, 0, 0], 2: [100, 0, 0, 0, 0], 3: [75, 25, 0, 0, 0], 4: [55, 30, 15, 0, 0],
    5: [45, 33, 20, 2, 0], 6: [30, 40, 25, 5, 0], 7: [20, 30, 33, 16, 1],
    8: [16, 20, 35, 25, 4], 9: [9, 15, 30, 30, 16]
  };
  const POOL_COUNT = { 1: 29, 2: 22, 3: 18, 4: 12, 5: 10 };
  const MAX_LEVEL = 9;
  const BENCH_SIZE = 9;
  const ITEM_BENCH_SIZE = 10;
  const MAX_ITEMS_PER_UNIT = 3;
  const STAR_MULT = { hp: [1, 1.8, 3.24], ad: [1, 1.5, 2.25], ap: [1, 1.5, 2.25] };

  const BOT_NAMES = [
    { name: 'Kaan', icon: '🦁' }, { name: 'Elif', icon: '🦊' }, { name: 'Mert', icon: '🐺' },
    { name: 'Zeynep', icon: '🦉' }, { name: 'Burak', icon: '🐻' }, { name: 'Selin', icon: '🦄' },
    { name: 'Emre', icon: '🐯' }, { name: 'Deniz', icon: '🐬' }
  ];

  const AUGMENT_ROUNDS = ['2-1', '3-3', '4-5'];
  const CAROUSEL_ROUNDS = ['1-1', '2-4', '3-4', '4-4', '5-4', '6-4', '7-4'];

  function abilityText(champ, star) {
    const a = champ.ability, s = Math.max(0, Math.min(2, star - 1));
    const d = a.dmg ? a.dmg[s] : 0;
    const p = [];
    if (d > 0) p.push((a.dmgType === 'physical' ? '⚔️ ' : a.dmgType === 'true' ? '💀 ' : '✨ ') + d + ' hasar');
    if (a.stun) p.push(a.stun + ' sn sersemletme');
    if (a.shield || a.shieldSelf) p.push('kalkan');
    if (a.heal) p.push('iyileşme');
    if (a.as) p.push('+%' + Math.round(a.as * 100) + ' saldırı hızı');
    if (a.burn) p.push('yakma');
    return p.join(' · ');
  }

  TFT.DATA = {
    TRAITS, CHAMPS, CHAMP_BY_ID, COMPONENTS, COMP_KEYS, COMBINED, SPECIAL_DESC,
    AUGMENTS, PVE_WAVES, CREEP_DEFS, XP_TABLE, XP_COST, XP_PER_BUY, REROLL_COST,
    SHOP_ODDS, POOL_COUNT, MAX_LEVEL, BENCH_SIZE, ITEM_BENCH_SIZE, MAX_ITEMS_PER_UNIT,
    STAR_MULT, BOT_NAMES, AUGMENT_ROUNDS, CAROUSEL_ROUNDS,
    buildItem, itemKey, statText, abilityText
  };
})();
