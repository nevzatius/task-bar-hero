# TBH Item Advisor — Task Bar Hero Save Analyzer

**🌐 Siteyi kullanmak için: [https://nevzatius.github.io/task-bar-hero/](https://nevzatius.github.io/task-bar-hero/)**

*TBH: Task Bar Hero* oyunu için resmi olmayan bir hayran aracı. Kayıt (save) dosyanı analiz eder ve şu soruya cevap verir: **hangi itemi hangi kahramana vermelisin?**

> 🔒 **Gizlilik:** Save dosyan hiçbir sunucuya yüklenmez. Şifre çözme ve analiz tamamen tarayıcının içinde, kendi bilgisayarında yapılır.

## Ne yapar?

- **Kahraman analizi** — Save dosyandaki kahramanları, seviyelerini ve ekipmanlarını gösterir.
- **Ekipman planı** — Her kahramanın 10 ekipman slotunu, o kahramanın şu anki seviyesine uygun sahip olduğun en iyi eşyayla eşleştirir.
- **Envanter & depo önerileri** — Hangi eşyayı kullanmalı, hangisini satmalı/saklamalısın.
- **Skill ağacı rehberi** — Sınıf ve seviyeye göre önerilen skill puanı dağılımı, sınıf tier listesi ve takım önerileri.
- **Taş rehberi** — Süsleme / Kazıma / Nakış taşlarının silah, zırh ve aksesuardaki gerçek değerleri (oyun verisinden çözülmüştür, tahmin değildir).

## Nasıl kullanılır?

1. [Siteyi aç](https://nevzatius.github.io/task-bar-hero/).
2. Save dosyanı bul. Genelde şurada:
   ```
   %USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3
   ```
3. `SaveFile_Live.es3` dosyasını sayfadaki alana sürükle-bırak (veya dosya seçiciden seç).
4. Analiz sonuçları anında görüntülenir.

## Yerelde çalıştırma (geliştiriciler için)

Site tamamen statiktir; derleme adımı yoktur. Depoyu klonlayıp herhangi bir statik sunucuyla açman yeterli:

```bash
git clone https://github.com/nevzatius/task-bar-hero.git
cd task-bar-hero
python -m http.server 8000
# http://localhost:8000 adresini aç
```

> Not: Sayfa ES modülleri kullandığı için `index.html` dosyasını doğrudan çift tıklayarak açmak yerine bir yerel sunucu üzerinden açmak gerekir.

### Proje yapısı

| Dosya | Görev |
|---|---|
| `index.html` | Tek sayfalık arayüz |
| `js/es3-crypto.js` | ES3 save dosyasının şifresini çözer |
| `js/save-parser.js` | Save verisini ayrıştırır |
| `js/item-db.js` | Item veritabanı |
| `js/loadout-planner.js` | Kahraman ekipman planlayıcısı |
| `js/recommender.js` | Envanter/depo önerileri |
| `js/skill-guide.js` | Skill ağacı rehberi ve hesaplayıcısı |
| `js/socket-guide.js` | Taş (süsleme/kazıma/nakış) rehberi |
| `assets/icons/` | Oyun içi item ikonları |

## English (TL;DR)

An unofficial fan-made web tool for the game *TBH: Task Bar Hero*. Drop your `SaveFile_Live.es3` save file onto the page and it tells you which item to give to which hero, plans optimal loadouts, and includes skill tree and gem socket guides. Everything runs locally in your browser — **your save file is never uploaded anywhere**.

**Use it here: [https://nevzatius.github.io/task-bar-hero/](https://nevzatius.github.io/task-bar-hero/)**

## Yasal uyarı

Bu site, *TBH: Task Bar Hero* oyununun resmi olmayan bir hayran aracıdır; Nugem Studio / Tesseract Studio ile hiçbir bağlantısı yoktur. Skill ağacı verileri [taskbarhero.org](https://taskbarhero.org/en/) kaynağından alınmıştır.
