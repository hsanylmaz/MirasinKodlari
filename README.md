# 📸 Mirasın Kodları — Yeşil Perde (Chroma Key) Fotoğraf Stüdyosu

**"Mirasın Kodları"** yarışmasına katılan öğrencilerin yeşil perde (green screen) önünde arka plan seçerek fotoğraf çekilebileceği, çekilen fotoğrafları tek dokunuşla kendi telefonlarına indirebileceği web ve mobil uyumlu interaktif **Chroma Key Fotoğraf Stüdyosu**.

🌐 **Canlı Stüdyo Adresi (GitHub Pages):** [https://hsanylmaz.github.io/MirasinKodlari/](https://hsanylmaz.github.io/MirasinKodlari/)  
🖨 **Yazdırılabilir A4 QR Karşılama Afişi:** [https://hsanylmaz.github.io/MirasinKodlari/afis.html](https://hsanylmaz.github.io/MirasinKodlari/afis.html)

---

## ✨ Özellikler

- **Gerçek Zamanlı Chroma Key (Yeşil Perde) Motoru:** YCbCr renk uzayı algoritması ile 60 FPS hızında yeşil perde temizleme, kenar yumuşatma (smoothness) ve omuz/saç kenarlarındaki yeşil parlamaları gideren *Spill Suppression* filtresi.
- **Tek Tıkla Yeşil Tonu Kalibrasyonu:** Ortam ışığına göre ekrandaki yeşil perdeye dokunarak/tıklayarak (`🎯 Ekrandan Yeşil Tonu Seç`) anında renk kalibrasyonu ve telefon fotoğraflarında otomatik yeşil algılama.
- **Mobil & Masaüstü Hibrit Kullanım (Wi-Fi Zorunluluğu Yok):**
  - Öğrenciler kendi telefonlarının internetiyle QR kodu okutup doğrudan stüdyoya bağlanabilir.
  - Canlı **Ön (Selfie) / Arka Kamera** geçişi veya telefonun kendi orijinal fotoğraf kamerasıyla çekim desteği.
  - **`⬇ Telefonuma / Cihazıma İndir`** ve **`📤 Telefonda Paylaş / Fotoğraflara Kaydet`** butonlarıyla 1920x1080 Full HD çıktı.
- **Otomatik Arka Plan Klasörü (`arkaplanlar/`):** `arkaplanlar/` klasörüne eklenen tüm `.jpg`, `.jpeg`, `.png`, `.webp` ve `.svg` görseller otomatik olarak sahne şeridine eklenir.
- **"Mirasın Kodları" Yarışma Çerçevesi:** Fotoğrafın alt kısmına isteğe bağlı yarışma başlığı, tarih ve **Öğrenci Adı / Takım Adı** bandı işlenir.

---

## 🚀 Hızlı Başlangıç

### 1. İnternet Üzerinden (GitHub Pages - Kurulumsuz)
1. [A4 QR Karşılama Afişini](https://hsanylmaz.github.io/MirasinKodlari/afis.html) yazdırıp yeşil perdenin yanına asın veya ekranda **`📱 STÜDYO GİRİŞ QR KODU`** penceresini açın.
2. Öğrenciler telefon kameralarıyla QR kodu okutarak stüdyoyu açar, arka planı seçip fotoğrafını çeker ve doğrudan telefonuna indirir.

### 2. Yerel Bilgisayarda Çalıştırma (Stüdyo Kiosk + Bilgisayara Yedekleme Modu)
Bilgisayarda çalıştırıldığında çekilen tüm fotoğrafların bir kopyası otomatik olarak `kaydedilen_fotograflar/` klasörüne de arşivlenir:

```bash
# Bağımlılıkları yükleyin
npm install

# Stüdyo sunucusunu başlatın (http://localhost:3000)
npm start
```

> **Windows Kısayolu:** Proje klasöründeki `BASLAT_Mirasin_Kodlari.bat` dosyasına çift tıklayarak sunucuyu ve tarayıcıyı tek adımda başlatabilirsiniz.

---

## 🖼 Yeni Arka Plan Görseli Ekleme

1. Yeni arka plan görsellerinizi (önerilen: `1920x1080` yatay `.jpg` veya `.png`) doğrudan **`arkaplanlar/`** klasörünün içine kopyalayın.
2. Klasördeki **`GITHUB_YUKLE.bat`** dosyasına çift tıklayın (veya doğrudan GitHub web arayüzünden `arkaplanlar/` klasörüne *Add file -> Upload files* ile yükleyin).
3. GitHub Actions yeni görselleri otomatik tarayarak bir dakika içinde canlı siteye ekler.

---

## 📁 Proje Yapısı

```text
MirasinKodlari/
├── arkaplanlar/                 # Yarışma arka plan görsellerinin bulunduğu klasör
├── kaydedilen_fotograflar/      # Yerel modda çekilen fotoğrafların arşivlendiği klasör
├── public/                      # Stüdyo arayüzü ve Chroma Key motoru
│   ├── index.html               # Ana stüdyo ve mobil çekim ekranı
│   ├── afis.html                # Yazdırılabilir A4 QR karşılama afişi
│   ├── css/studio.css           # Broadcast HUD koyu stüdyo tasarımı
│   └── js/
│       ├── chroma-engine.js     # YCbCr Chroma Key, Spill Suppression ve çerçeve motoru
│       ├── app.js               # Kamera, galeri, QR ve indirme kontrolcüsü
│       └── audio-fx.js          # Web Audio API geri sayım ve deklanşör ses efektleri
├── src/                         # Yerel Node.js + Express + TypeScript sunucusu
├── scripts/build-static.js      # GitHub Pages statik paket ve QR oluşturucu
├── BASLAT_Mirasin_Kodlari.bat   # Yerel stüdyo başlatıcı
└── GITHUB_YUKLE.bat             # Arka planları paketleyip GitHub'a gönderen araç
```

---

## 📄 Lisans

Bu proje **Mirasın Kodları** yarışması ve eğitim etkinlikleri için geliştirilmiştir. MIT Lisansı altında özgürce kullanılabilir.
