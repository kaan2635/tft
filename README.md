# ⚔️ TFT Arena — Offline

Teamfight Tactics benzeri, **tamamen tarayıcıda çalışan** (HTML + CSS + JavaScript, derleme yok, bağımlılık yok) otomatik savaş oyunu.
Tek oyunculu: **7 bot oyuncuya** karşı 8 kişilik lobide hayatta kalmaya çalışırsın. İnternet gerekmez — `index.html` dosyasını açman yeterli.

```
┌──────────────────────────────────────────────────────────────┐
│ 7x4 hex tahta · 9 yedek · 8 bileşen / 36 tamamlanmış eşya     │
│ 53 şampiyon · 22 sinerji · 15 augment · carousel · PvE dalgaları │
└──────────────────────────────────────────────────────────────┘
```

## Giriş ekranı
Açılışta tam ekran giriş ekranı gelir: başlık, dönen 8 şampiyon vitrini, **▶ OYNA**, **📖 NASIL OYNANIR**
ve **🔊 SES** düğmeleri, en iyi derecen. OYNA'ya basınca ilk tur (carousel) başlar.

## Nasıl çalıştırılır

**En basit:** `index.html` dosyasına çift tıkla (Chrome / Edge / Firefox).

**Yerel sunucu ile (önerilir):**
```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

## Oynanış

| | |
|---|---|
| **Amaç** | 8 oyunculu lobide sona kalan olmak. Botlar birbirleriyle de savaşır. |
| **Tur akışı** | Planlama (mağaza, yerleştirme) → otomatik savaş → gelir/XP → sonraki tur. |
| **Ekonomi** | Tur başına 5 altın + faiz (10 altın = 1, en fazla 5) + seri bonusu + zafer altını. |
| **Seviye** | XP ile artar (maks. 9). Seviye = tahtaya koyabileceğin birim sayısı. |
| **Yıldız** | 3 aynı şampiyon → 2★, 3 tane 2★ → 3★ (can/saldırı ~1.8x / 1.5x). |
| **Eşya** | İki bileşeni üst üste sürükle → tamamlanmış eşya. Birim başına en fazla 3 eşya. |
| **Sinerji** | Aynı sinerjiden **farklı** şampiyonlar tahtadayken eşikler açılır (sol panel). |
| **PvE** | 1-1 carousel, 1-2/1-3/1-4 minyonlar; her stage'in 7. turunda canavar dalgası (Krug, Kurt, Raptor, Golem, Kadim Ejder). |
| **Carousel** | 1-1, 2-4, 3-4, 4-4 …: şampiyon + eşya seçimi. |
| **Augment** | 2-1, 3-2, 4-2, 5-2: 3 seçenekten 1'i, oyun boyu süren güçlendirme. |
| **Rakip keşfi** | Üst bardaki oyuncu ismine tıkla → rakibin tahtasını, seviyesini ve sinerjilerini gör. |

### Kısayollar
`D` yenile · `F` XP al · `R` hazır (savaşı başlat) · `E` seçili birimi sat · `1-5` mağaza slotu · `Esc` seçimi bırak · `Boşluk` hazır

### Fare ile
- Birimleri **tahta ↔ yedek** arasında sürükle; dolu hex'e bırakınca yer değiştirir.
- Eşyayı birimin üstüne sürükle → takılır.
- Birimi sağ alttaki **SAT** alanına (veya mağaza panelinin üstüne) sürükle → sat.
- Savaş sırasında **⏭ Savaşı Bitir** ile simülasyonu hızlandır; sağ üstten 1x/2x/3x hız.

### 📱 Telefon / tablet (dokunmatik)
Hover'a bağlı hiçbir şey yok — her şey tek dokunuşla çalışır. Ekran dar ya da işaretçi dokunmatikse arayüz
otomatik olarak **mobil düzene** geçer (`body.is-mobile`): mağaza alta, sinerjiler çekmeceye, yedek + eşya
tahtanın hemen altına taşınır.

| Ne yapmak istiyorsun? | Nasıl? |
|---|---|
| Birim al | Mağaza kartına dokun (5 kart yan yana, maliyet renkli çerçeve) |
| Yedeğe yerleştir | **Birime dokun** (seçilir, altın halka) → tahtada bir kareye dokun |
| Yedekten tahtaya alma | Yedekteki birime dokun → kareye dokun (ilk dokunuş seçer) |
| Birim bilgisi / satış | Tahtadaki birime dokun → alt sayfa: istatistikler, yetenek, eşyalar, **SAT** |
| Eşya tak | Eşya yuvasına dokun (ipucu çıkar) → birime dokun |
| Eşya birleştir | Bileşen → bileşen dokun (aynı davranış) |
| Sinerjiler | Üst barda **📊** → soldan çekmece açılır, **✕** / perde kapatır |
| Yenile / XP | **🔄 YENİLE**, **⬆ XP AL** düğmeleri |
| Diz / Hazır | **⚡ DİZ**, **HAZIR!** |
| Savaş | Otomatik; **⏭ Savaşı Bitir** ile hızlandır |

Yatay tutunca (landscape) arayüz kendini yeniden kurar: mağaza sağ sütuna geçer, tahta tam yüksekliği kullanır.
Çift dokunuş yakınlaştırması, kaydırma zıplaması ve metin seçimi kapatılmıştır; `env(safe-area-inset-*)` ile
çentikli ekranlar desteklenir.

## Özellikler

- **Şampiyon sanatı**: 6 painterly kart arka planı (savaşçı, büyücü, nişancı, suikastçı, muhafız, efsane) şampiyonun sinerjisine/menziline göre seçilir, trait rengiyle harmanlanır ve tek dosyaya gömülüdür.
- **53 şampiyon**, 5 maliyet kademesi, her biri için özel yetenek (tek hedef, alan, nova, zincir, infaz, atılma, emme, kalkan, iyileştirme, buff…) ve 2 sinerji.
- **22 sinerji**: Soylu, İmparatorluk, Ninja, Boşluk, Buzul, Şeytan, Ejder, Yordle, Korsan, Vahşi, Robot, Sürgün + Suikastçı, Kılıç Ustası, Yumruk, Elementalist, Silahşör, Şövalye, Nişancı, Büyücü, Muhafız, Şekil Değiştiren.
- **8 bileşen + 36 tamamlanmış eşya**, gerçek etkilerle (Guinsoo yığılması, Statikk zinciri, Zefir savaş dışı bırakma, Morello yakma, Bramble yansıtma, Thief's Gloves rastgele eşya, …).
- **Hex tabanlı savaş motoru**: odd-r offset koordinatlar, komşuluk/mesafe matematiği, en yakın hedefleme, hex-hex hareket, menzil, mana, kritik, zırh/direnç, kalkan, sersemletme, kaçınma, yanma, zırh kırma, blok.
- **Bot yapay zekâsı**: her bot kendi kompunu (taşıyıcı + sinerjiler), seviyesini, yıldızlarını ve eşyalarını kurar; birbirleriyle soyut güç karşılaştırmasıyla savaşır, elenir ve sıralamaya girer.
- **Tam ekonomi simülasyonu**: seviyeye göre mağaza oranları, ortak şampiyon havuzu, faiz, seri, XP, mağaza kilidi.
- **Augmentler**, carousel, PvE ödülleri, eşya düşmeleri, en iyi derece kaydı (localStorage).
- Ses efektleri (kapatılabilir), tooltipler, savaş metni/efektleri, sonuç ekranı ve istatistikler.

## Dosya yapısı

```
index.html          ÜRETİLEN tek dosya (CSS + JS gömülü) — doğrudan açılır
src/index.template.html  şablon (gövde iskeleti, INJECT işaretleri)
tools/build.py      şablon + css + js dosyalarını index.html içine gömer
assets/style.css    tüm tema + hex tahta + animasyonlar + mobil katman
assets/art/*.png    şampiyon kart sanatı (build'de 256px JPEG data-uri olarak gömülür)
src/data.js         şampiyonlar, sinerjiler, eşyalar, augmentlar, PvE, sabitler
src/combat.js       DOM'suz savaş motoru (hex math, hedefleme, yetenekler, eşya etkileri)
src/bots.js         bot kadro üretimi, güç hesabı, bot-bot sonucu, PvE dalgaları
src/game.js         oyun durumu, ekonomi, mağaza, tur akışı, carousel/augment
src/ui.js           render, sürükle-bırak, tooltip, savaş görselleri, modallar
tests/              headless testler (motor, arayüz, otomatik oynatma)
```

## Testler

```bash
# Savaş motoru (saf node, bağımlılık yok)
node tests/engine-test.js

# Sinerji + eşya etkileri (saf node)
node tests/effects-test.js

# Arayüz + oyun akışı (jsdom gerekir)
npm i jsdom && NODE_PATH=./node_modules node tests/dom-test.js

# Otomatik oynatma / denge
NODE_PATH=./node_modules node tests/autoplay2.js 3

# Zafer / eleme / yeniden başlatma akışı
NODE_PATH=./node_modules node tests/victory-test.js

# Mobil düzen + dokunmatik etkileşimler (390x844)
NODE_PATH=./node_modules node tests/mobile-test.js

# Tam oyunu sadece dokunuşlarla oynatan uçtan uca test
NODE_PATH=./node_modules node tests/mobile-flow-test.js
```

### Tek dosyayı yeniden üretmek
`src/` veya `assets/` içinde değişiklik yaptıysan:
```bash
pip install pillow       # sanat dosyalarını küçültüp gömmek için (opsiyonel)
python3 tools/build.py   # -> index.html (CSS + JS + sanat gömülü, harici istek yok)
```
Pillow yoksa build yine çalışır; sanat katmanı boş kalır (renkli gradyanlar kullanılır).

Motor testi tüm 53 şampiyonu, 36 eşyayı, 22 sinerjiyi, PvE dalgalarını ve 100 rastgele savaşı kapsar. Etki testi her sinerjinin ve her eşyanın gerçekten uygulandığını doğrular.

## Notlar

- Oyun tamamen istemci tarafındadır; hiçbir ağ isteği yapmaz, veri toplamaz.
- Tasarım Teamfight Tactics'ten esinlenmiş **özgün bir yeniden yorumdur**; Riot Games ile bağlantılı değildir.
