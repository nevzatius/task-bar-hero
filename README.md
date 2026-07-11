# TBH Item Advisor — Task Bar Hero Save Analyzer

**🌐 Siteyi kullanmak için: [https://nevzatius.github.io/task-bar-hero/](https://nevzatius.github.io/task-bar-hero/)**

*TBH: Task Bar Hero* oyunu için resmi olmayan bir hayran aracı. Kayıt (save) dosyanı analiz eder ve şu soruya cevap verir: **hangi itemi hangi kahramana vermelisin?** Wiki tarzı bir arayüzde kahraman/ekipman analizinin yanı sıra taş, skill, farm ve Steam Market fiyat rehberlerini de barındırır.

> 🔒 **Gizlilik:** Save dosyan hiçbir sunucuya yüklenmez. Şifre çözme ve analiz tamamen tarayıcının içinde, kendi bilgisayarında yapılır.

## Ne yapar?

- **Kahraman analizi** — Save dosyandaki kahramanları, seviyelerini ve ekipmanlarını gösterir; istersen ekipmanların Steam Market fiyatını da listeler.
- **Ekipman planı** — Her kahramanın 10 ekipman slotunu, o kahramanın şu anki seviyesine uygun sahip olduğun en iyi eşyayla eşleştirir.
- **Envanter & depo önerileri** — Hangi eşyayı kullanmalı, hangisini satmalı/saklamalısın; arama, kalite/tip filtresi ve "sadece yükseltmeler" seçeneğiyle.
- **Taş rehberi** — Süsleme / Kazıma / Nakış taşlarının silah, zırh ve aksesuardaki gerçek değerleri (oyun verisinden çözülmüştür, tahmin değildir) ve seçtiğin bir iteme özel taş önerisi.
- **Skill ağacı rehberi** — Sınıf ve seviyeye göre önerilen skill puanı dağılımı, sınıf tier listesi ve takım önerileri. Save dosyası gerektirmez.
- **Farm rehberi** — Bölüm/kutu drop oranlarına göre altın, XP veya belirli bir eşya için en verimli farm hedefini önerir.
- **Steam Fiyatları** — Satılabilir eşyaların Steam Community Market fiyat anlık görüntüsü; arama/sıralama ve (save yüklüyse) sahip olduğun eşyaların vurgulanması.
- **Sohbet widget'ı** — Sağ altta, buton tabanlı soru-cevap ile kahraman/sınıf rehberi.
- Koyu/açık **tema** desteği ve daraltılabilir kenar çubuğu ile wiki tarzı düzen.

## Nasıl kullanılır?

1. [Siteyi aç](https://nevzatius.github.io/task-bar-hero/).
2. Save dosyanı bul. Genelde şurada:
   ```
   %USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3
   ```
3. `SaveFile_Live.es3` dosyasını sayfadaki alana sürükle-bırak (veya dosya seçiciden seç).
4. Analiz sonuçları anında görüntülenir. Save yüklemeden de **Skill Rehberi**, **Farm Rehberi** ve **Steam Fiyatları** sekmelerine bakabilirsin.

## Yerelde çalıştırma (geliştiriciler için)

Site tamamen statiktir; derleme adımı, bundler veya npm bağımlılığı yoktur. Depoyu klonlayıp basit bir Node sunucusuyla açman yeterli:

```bash
git clone https://github.com/nevzatius/task-bar-hero.git
cd task-bar-hero
node tools/serve.mjs        # varsayılan port 8080, ör. node tools/serve.mjs 3000
# http://localhost:8080 adresini aç
```

> Not: Sayfa ES modülleri kullandığı ve `data/*.json` dosyalarını `fetch()` ile çektiği için `index.html` dosyasını doğrudan çift tıklayarak (`file://`) açmak çalışmaz; bir yerel sunucu gerekir.

### Proje yapısı

| Dosya | Görev |
|---|---|
| `index.html` | Tek sayfalık wiki arayüzü (sekmeler, tema, sohbet widget'ı) |
| `style.css` | Tüm görünüm (koyu/açık tema dahil) |
| `js/app.js` | Sayfayı ayağa kaldırır, tüm modülleri birbirine bağlar, DOM/render işleri |
| `js/es3-crypto.js` | ES3 save dosyasının şifresini çözer |
| `js/save-parser.js` | Save verisini ayrıştırır |
| `js/item-db.js` | Item/kahraman veritabanı ve Türkçe etiket eşlemeleri |
| `js/loadout-planner.js` | Kahraman ekipman planlayıcısı |
| `js/recommender.js` | Envanter/depo önerileri ve skor hesaplama |
| `js/socket-guide.js` | Taş (süsleme/kazıma/nakış) rehberi ve item bazlı taş önerisi |
| `js/skill-guide.js` | Skill ağacı rehberi ve puan dağılımı hesaplayıcısı |
| `js/farm-guide.js` | Bölüm/kutu drop verisine göre farm hedefi önerisi |
| `js/chat-guide.js` | Buton tabanlı Sohbet widget'ının soru-cevap mantığı |
| `js/icons.js` | Item/kahraman ikonlarını kalite renkli halkada gösterir (yoksa SVG placeholder) |
| `js/modal.js` | Kart tıklamalarında açılan detay modalı |
| `data/*.json` | Oyundan datamine edilmiş item/kahraman/bölüm/fiyat verisi (elle düzenlenmez) |
| `assets/icons/` | Oyun içi item ve kahraman ikonları |
| `tools/serve.mjs` | Bağımlılıksız statik geliştirme sunucusu |
| `tools/extract-game-data.mjs` | Oyunun Unity assets dosyasından `data/*.json` üretir |
| `tools/download-icons.mjs` | taskbarhero.org'dan `assets/icons/` içine ikon indirir |
| `tools/fetch-steam-prices.mjs` | Steam Community Market'ten `data/steam-prices.json` üretir |

## English (TL;DR)

An unofficial fan-made web tool for the game *TBH: Task Bar Hero*. Drop your `SaveFile_Live.es3` save file onto the page and it tells you which item to give to which hero, plans optimal loadouts, and includes gem socket, skill tree, farming, and Steam Market price guides — plus a button-driven chat widget for quick class/hero Q&A. Everything runs locally in your browser — **your save file is never uploaded anywhere**.

**Use it here: [https://nevzatius.github.io/task-bar-hero/](https://nevzatius.github.io/task-bar-hero/)**

## Yasal uyarı

Bu site, *TBH: Task Bar Hero* oyununun resmi olmayan bir hayran aracıdır; Nugem Studio / Tesseract Studio ile hiçbir bağlantısı yoktur. Skill ağacı ve item verileri [taskbarhero.org](https://taskbarhero.org/en/) kaynağından alınmıştır; Steam Market fiyatları Steam'in resmi arama uç noktasından çekilmiştir.
