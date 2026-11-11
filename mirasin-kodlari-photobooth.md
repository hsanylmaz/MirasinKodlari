# Mirasın Kodları — Yeşil Perde (Chroma Key) Fotoğraf Stüdyosu Planı

## Overview
"Mirasın Kodları" yarışmasına katılan öğrencilerin yeşil perde önünde gerçek zamanlı (60 FPS) arka plan seçerek fotoğraf çekilebileceği, çekilen fotoğrafların otomatik olarak bilgisayara (`kaydedilen_fotograflar/` klasörüne) kaydedildiği ve ekranda oluşan **QR Kod** ile öğrencilerin kendi telefonlarına anında indirebildiği web tabanlı Kiosk/Stüdyo uygulaması.

## Project Type
**WEB (Full-Stack Local Kiosk & LAN QR Server)**
- **Primary Agents:** `project-planner`, `orchestrator`, `frontend-specialist`, `backend-specialist`
- **Core Skills:** `clean-code`, `design-spec`, `frontend-design`, `frontend-architecture`, `api-patterns`, `lint-and-validate`, `verify-changes`

## Success Criteria
1. **Otomatik Arka Plan Klasörü (`arkaplanlar/`):** Kullanıcının proje kök dizinindeki `arkaplanlar/` klasörüne attığı tüm görseller (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`) kod değişikliği gerekmeden otomatik olarak ekranda listelenir.
2. **Gerçek Zamanlı Chroma Key Motoru + Otomatik Yeşil Algılama:** Canlı kamera görüntüsü veya telefon kamerasıyla çekilen fotoğraf üzerinde yeşil rengi otomatik algılar (`autoDetectGreenFromImage`), ekrandan tıklayarak yeşil renk seçme (Eyedropper), tolerans (benzerlik), kenar yumuşatma (smoothness) ve yeşil yansıma giderme (spill suppression) ayarları 60 FPS akıcılıkta çalışır.
3. **Mobil Self-Servis Çekim & Doğrudan Telefona İndirme:** Öğrenciler kendi telefon tarayıcılarından stüdyoya girip telefonlarının arka/selfie kamerasıyla yeşil perde önünde fotoğraf çekebilir, arka planı seçip **"⬇ Cihazıma / Telefonuma İndir"** butonuyla doğrudan telefonlarına indirebilir; aynı anda bir kopyası bilgisayardaki `kaydedilen_fotograflar/` klasörüne otomatik yedeklenir.
4. **Dahili 2'li QR Karşılama Panosu (Wi-Fi QR + Stüdyo Giriş QR):** Bilgisayar ekranında tek tıkla açılan karşılama panosu ile öğrenciler 1. QR kodu okutup Wi-Fi ağına bağlanır, 2. QR kodu okutup telefonlarında fotoğraf çekim ekranını açar.
5. **Yarışma Teması (Overlay):** Fotoğraf üzerine isteğe bağlı "Mirasın Kodları" yarışma çerçevesi, tarih ve öğrenci/takım adı bandı eklenir.

## Tech Stack
- **Backend & LAN Sunucusu:** Node.js + Express + TypeScript (Yerel IP tespiti, `arkaplanlar/` klasörü canlı tarama, `kaydedilen_fotograflar/` diske kayıt, QR kod üretimi ve mobil indirme sayfası sunumu).
- **Frontend (Kiosk Stüdyo Arayüzü):** HTML5 Canvas 2D/WebGL Piksel İşleme Motoru + Modern TypeScript/JS + Tailwind CSS (Koyu Yayın Stüdyosu / Broadcast HUD tasarımı, sıfır mor renk, keskin teknik geometri).
- **QR Kod:** `qrcode` paketi ile sunucu ve istemci tarafında yüksek kontrastlı SVG/DataURL QR üretimi.

## File Structure
```text
Mirasin_Kodlari/
├── DESIGN.md                        # Tasarım tokenları ve görsel kurallar
├── mirasin-kodlari-photobooth.md    # Proje planı
├── package.json                     # Bağımlılıklar ve çalışma komutları
├── tsconfig.json                    # TypeScript yapılandırması
├── arkaplanlar/                     # Kullanıcının hazır arka plan görsellerini atacağı klasör
├── kaydedilen_fotograflar/          # Çekilen öğrenci fotoğraflarının otomatik kaydedildiği klasör
├── src/
│   ├── server.ts                    # Express sunucusu, LAN IP algılama ve mobil indirme rotası
│   ├── routes/
│   │   └── studio.routes.ts         # /api/backgrounds, /api/photos, /api/network-info uç noktaları
│   ├── services/
│   │   ├── storage.service.ts       # Klasör okuma, fotoğraf kaydetme ve dosya güvenliği
│   │   └── network.service.ts       # Yerel Wi-Fi / LAN IPv4 adreslerini tespit etme
│   └── types/
│       └── studio.types.ts          # Veri modelleri ve API şemaları
└── public/
    ├── index.html                   # Kiosk Stüdyo Ana Ekranı
    ├── css/
    │   └── studio.css               # Broadcast HUD özel tasarım kuralları
    └── js/
        ├── app.js                   # Ana uygulama durumu ve UI kontrolcüsü
        ├── chroma-engine.js         # Gerçek zamanlı YCbCr/RGB Chroma Key ve Spill Suppression motoru
        └── audio-fx.js              # Geri sayım bip ve deklanşör ses sentezleyici (Web Audio API)
```

## Task Breakdown

| Task ID | Name | Agent | Skills | Priority | Dependencies | INPUT → OUTPUT → VERIFY |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | Tasarım Spesifikasyonu (`DESIGN.md`) | `frontend-specialist` | `design-spec`, `frontend-design` | P0 | - | Yarışma gereksinimleri → `DESIGN.md` → Token şeması doğrulaması |
| **T2** | Klasör Yapısı ve Örnek Arka Planlar | `backend-specialist` | `clean-code` | P0 | T1 | Boş dizin → `arkaplanlar/` ve `kaydedilen_fotograflar/` + 4 adet örnek yarışma arka planı → Dosyaların varlığı |
| **T3** | Backend Servisleri (LAN IP, Arka Plan Tarayıcı, Fotoğraf Kayıt ve QR) | `backend-specialist` | `api-patterns`, `clean-code` | P1 | T2 | `src/server.ts`, `src/services/*` → Çalışan REST API ve `/indir/:id` mobil sayfası → `curl http://localhost:3000/api/backgrounds` 200 OK |
| **T4** | Gerçek Zamanlı Chroma Key & Çerçeve Motoru | `frontend-specialist` | `frontend-architecture`, `clean-code` | P1 | T2 | Kamera akışı + arka plan → `chroma-engine.js` (renk seçici, tolerans, kenar yumuşatma, yarışma bandı) → 60 FPS Canvas çıktısı |
| **T5** | Kiosk Stüdyo Arayüzü ve QR Modal | `frontend-specialist` | `frontend-design`, `tailwind-patterns` | P2 | T3, T4 | `public/index.html`, `public/js/app.js` → Tam ekran fotoğraf kabini arayüzü → Tarayıcıda önizleme ve çekim testi |
| **T6** | Doğrulama, Tip Kontrolü ve Test | `orchestrator` | `lint-and-validate`, `verify-changes` | P3 | T5 | Tüm kaynak kod → `npx tsc --noEmit` ve API uç nokta testleri → Sıfır hata |

## Phase X: Verification Checklist
- [x] `DESIGN.md` kök dizinde oluşturuldu
- [x] Mor/eflatun (Purple Ban) renk kullanılmadı (`#F59E0B` Kehribar Altın ve `#10B981` Zümrüt Yeşili kullanıldı)
- [x] `arkaplanlar/` klasörüne atılan resimler otomatik algılanıyor
- [x] Fotoğraf çekildiğinde `kaydedilen_fotograflar/` klasörüne kaydediliyor ve QR kod üretiliyor
- [x] TypeScript derlemesi (`npx tsc --noEmit`) ve sunucu çalışma testi başarılı

## ✅ PHASE X COMPLETE
- Lint & TypeScript: ✅ Pass (`npx tsc --noEmit` 0 hata)
- Security: ✅ Path traversal koruması ve boyut doğrulaması aktif
- Build & Runtime: ✅ Sunucu `http://localhost:3000` ve yerel Wi-Fi IP üzerinde çalışıyor
- Date: 2026-11-10
