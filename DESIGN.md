---
version: alpha
name: Mirasin Kodlari Broadcast Studio
description: Dark broadcast monitor & heritage-tech photo booth interface designed for green screen studio environments without casting monitor color spill onto subjects.
colors:
  primary: "#F59E0B"
  primary-hover: "#D97706"
  secondary: "#10B981"
  tertiary: "#EF4444"
  neutral: "#090A0C"
  surface: "#111318"
  surface-elevated: "#181B22"
  border: "#262A34"
  on-surface: "#F3F4F6"
  on-surface-muted: "#9CA3AF"
  error: "#EF4444"
typography:
  headline-display:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.25
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.08em
rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 6px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-shutter:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: 16px
  panel-studio:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: 16px
---

# Mirasın Kodları — Broadcast Studio Design System

## Overview
"Mirasın Kodları" yarışması yeşil perde (Chroma Key) fotoğraf kabini için tasarlanmış **Koyu Yayın Stüdyosu (Broadcast Monitor HUD)** tasarım sistemi. Ekranın önünde duran öğrencilerin yüzüne monitörden mavi/mor ışık yansımasını (color spill) önlemek için düşük parlaklıklı karbon-siyah (`#090A0C`) zemin ve yüksek kontrastlı **Kehribar Altın (`#F59E0B`)** ile **Tally Zümrüt (`#10B981`)** vurguları kullanılır.

## Colors
- **Primary (`#F59E0B` - Miras Kehribarı):** Deklanşör (Fotoğraf Çek) butonu, seçili arka plan çerçevesi ve yarışma kimliği vurgusu.
- **Secondary (`#10B981` - Chroma Tally Yeşili):** Kamera aktif göstergesi, canlı yeşil perde anahtarlama durumu ve başarı bildirimleri.
- **Tertiary (`#EF4444` - Kayıt Kırmızısı):** Geri sayım sayacı (3-2-1) ve canlı çekim uyarısı.
- **Neutral & Surface (`#090A0C` / `#111318`):** Parlama yapmayan koyu stüdyo katmanları.

## Typography
- **Display & Başlıklar (`Space Grotesk`):** Teknik, keskin ve yarışma ruhuna uygun güçlü geometrik başlıklar.
- **Telemetri & Kontroller (`JetBrains Mono`):** Kamera çözünürlüğü, FPS, Chroma Key tolerans değerleri ve geri sayım rakamları için monospace teknik yazı tipi.
- **Gövde (`Plus Jakarta Sans`):** Öğrenci/takım adı girişleri ve yönergeler için yüksek okunabilirlik.

## Layout
- **Asimetrik Stüdyo Monitörü (75% Canlı Vizör / 25% Kontrol & Arka Plan İstasyonu):** Klasik web sayfası düzeni yerine tam ekran (`100dvh`) Kiosk yayın monitörü yerleşimi.
- Alt bölümde hızlı arka plan seçici film şeridi (Filmstrip Dock), sağ panelde Chroma Key ince ayar ve yarışma kimliği kontrolleri.

## Elevation & Depth
- Bulanık cam (glassmorphism) veya yapay renkli gölgeler yerine `1px` ve `2px` keskin teknik kenarlıklar (`#262A34`) ve köşe vizör işaretleyicileri (viewfinder brackets) kullanılır.

## Shapes
- Keskin teknik geometri (`2px` - `4px` köşe yarıçapı). Yuvarlak standart SaaS kartları kullanılmaz.

## Components
- **Vizör (Stage Canvas):** Köşelerinde kamera vizör çizgileri, üstte canlı durum çubuğu, ortada devasa geri sayım katmanı.
- **Filmstrip Arka Plan Seçici:** `arkaplanlar/` klasöründeki görselleri canlı önizlemeli yatay şerit olarak sunar.
- **QR İndirme Modalı:** Çekim sonrası fotoğrafın yanında büyük, telefon kamerasıyla uzaktan bile kolayca okunabilen yüksek kontrastlı QR kod kartı gösterir.

## Do's and Don'ts
- **Do:** Tüm butonlarda yüksek kontrast (kehribar zemin üzerinde siyah metin) kullanın.
- **Don't:** Mor, eflatun, çivit (indigo) veya standart mavi gradyanlar kesinlikle kullanmayın (Purple Ban).
- **Do:** `arkaplanlar/` klasörüne yeni görsel eklendiğinde sayfayı yeniden başlatmaya gerek kalmadan tek tıkla listeyi güncelleyin.
