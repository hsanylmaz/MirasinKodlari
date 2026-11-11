/**
 * GitHub Pages Statik Derleme Betiği (scripts/build-static.js)
 * - arkaplanlar/ klasöründeki tüm görselleri tarar ve _site/arkaplanlar/ içine kopyalar
 * - _site/backgrounds.json ve public/backgrounds.json dosyalarını otomatik üretir
 * - https://hsanylmaz.github.io/Mirasin_Kodlari/ için QR kodları ve A4 afişi üretir
 */
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const ARKAPLANLAR_DIR = path.join(PROJECT_ROOT, 'arkaplanlar');
const SITE_DIR = path.join(PROJECT_ROOT, '_site');

const GITHUB_USERNAME = 'hsanylmaz';
const REPO_NAME = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/')[1]
  : 'Mirasin_Kodlari';
const GITHUB_PAGES_URL = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/`;

const DEFAULT_WIFI_SSID = 'SUPERBOX_Wi-Fi_6306';
const DEFAULT_WIFI_PASS = '2wR83g6763';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

function formatBackgroundTitle(fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const cleaned = base
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return cleaned || base;
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function buildStaticSite() {
  if (fs.existsSync(SITE_DIR)) {
    fs.rmSync(SITE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(SITE_DIR, { recursive: true });

  // 1. public/ içeriğini _site/ içerisine kopyala
  copyDirRecursive(PUBLIC_DIR, SITE_DIR);

  // 2. arkaplanlar/ klasörünü _site/arkaplanlar/ içerisine kopyala ve listeyi oluştur
  const siteBgsDir = path.join(SITE_DIR, 'arkaplanlar');
  fs.mkdirSync(siteBgsDir, { recursive: true });

  const backgrounds = [];
  if (fs.existsSync(ARKAPLANLAR_DIR)) {
    const entries = fs.readdirSync(ARKAPLANLAR_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;

      const srcFile = path.join(ARKAPLANLAR_DIR, entry.name);
      const destFile = path.join(siteBgsDir, entry.name);
      fs.copyFileSync(srcFile, destFile);

      const stat = fs.statSync(srcFile);
      backgrounds.push({
        id: Buffer.from(entry.name).toString('base64url'),
        fileName: entry.name,
        title: formatBackgroundTitle(entry.name),
        url: `./arkaplanlar/${encodeURIComponent(entry.name)}`,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }

  backgrounds.sort((a, b) => a.fileName.localeCompare(b.fileName, 'tr'));

  const bgJsonContent = JSON.stringify({ success: true, data: backgrounds }, null, 2);
  fs.writeFileSync(path.join(SITE_DIR, 'backgrounds.json'), bgJsonContent, 'utf-8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'backgrounds.json'), bgJsonContent, 'utf-8');

  // 3. GitHub Pages ve Varsayılan Wi-Fi için QR kodlarını üret
  const wifiPayload = `WIFI:T:WPA;S:${DEFAULT_WIFI_SSID};P:${DEFAULT_WIFI_PASS};H:false;;`;
  const [githubPagesQrDataUrl, defaultWifiQrDataUrl] = await Promise.all([
    QRCode.toDataURL(GITHUB_PAGES_URL, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 420,
      color: { dark: '#090A0C', light: '#FFFFFF' },
    }),
    QRCode.toDataURL(wifiPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 420,
      color: { dark: '#090A0C', light: '#FFFFFF' },
    }),
  ]);

  const staticConfig = {
    isStaticBuild: true,
    githubUsername: GITHUB_USERNAME,
    repoName: REPO_NAME,
    githubPagesUrl: GITHUB_PAGES_URL,
    githubPagesQrDataUrl,
    defaultWifiSsid: DEFAULT_WIFI_SSID,
    defaultWifiPass: DEFAULT_WIFI_PASS,
    defaultWifiQrDataUrl,
  };

  const configJson = JSON.stringify(staticConfig, null, 2);
  fs.writeFileSync(path.join(SITE_DIR, 'static-config.json'), configJson, 'utf-8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'static-config.json'), configJson, 'utf-8');

  // 4. Yazdırılabilir A4 QR Karşılama Afişi (_site/afis.html ve kök QR_Karsilama_Afisi.html)
  const posterHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mirasın Kodları — Yeşil Perde Fotoğraf Stüdyosu QR Afişi</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #090A0C;
      color: #F3F4F6;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 28px 20px;
    }
    .toolbar {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }
    .btn-print {
      background: #F59E0B;
      color: #090A0C;
      border: none;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      text-transform: uppercase;
    }
    .poster {
      width: 100%;
      max-width: 920px;
      background: #111318;
      border: 4px solid #F59E0B;
      padding: 36px 32px;
      text-align: center;
    }
    .tag {
      display: inline-block;
      background: #F59E0B;
      color: #090A0C;
      font-family: monospace;
      font-weight: 800;
      font-size: 14px;
      padding: 6px 16px;
      letter-spacing: 0.12em;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 34px;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: #D1D5DB;
      font-size: 16px;
      margin-bottom: 26px;
    }
    .steps {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .step-card {
      background: #181B22;
      border: 2px solid #262A34;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .step-num {
      background: #10B981;
      color: #090A0C;
      font-family: monospace;
      font-weight: 800;
      font-size: 13px;
      padding: 5px 14px;
      margin-bottom: 12px;
    }
    .step-title {
      font-size: 21px;
      font-weight: 800;
      margin: 0 0 8px;
      color: #F59E0B;
    }
    .step-desc {
      font-size: 14px;
      color: #D1D5DB;
      margin-bottom: 16px;
      line-height: 1.45;
    }
    .qr-box {
      background: #FFFFFF;
      padding: 14px;
      border: 4px solid #F59E0B;
      width: 260px;
      height: 260px;
      margin-bottom: 16px;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .info-box {
      width: 100%;
      background: #090A0C;
      border: 1px solid #373D4B;
      padding: 12px;
      font-family: monospace;
      font-size: 13px;
      color: #F3F4F6;
      line-height: 1.6;
      word-break: break-all;
    }
    .info-box strong {
      color: #F59E0B;
    }
    @media print {
      body { background: #FFFFFF; color: #000000; padding: 0; }
      .toolbar { display: none; }
      .poster { background: #FFFFFF; color: #000000; border: 3px solid #000000; max-width: 100%; }
      h1 { color: #000000; }
      .subtitle, .step-desc { color: #222222; }
      .step-card { background: #F9FAFB; border: 2px solid #000000; }
      .step-title { color: #000000; }
      .info-box { background: #FFFFFF; color: #000000; border: 1px solid #000000; }
      .info-box strong { color: #000000; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">🖨 A4 OLARAK YAZDIR (CTRL+P)</button>
  </div>
  <div class="poster">
    <div class="tag">MİRASIN KODLARI YARIŞMASI</div>
    <h1>YEŞİL PERDE HATIRA FOTOĞRAF STÜDYOSU</h1>
    <div class="subtitle">Kendi telefonunuzun internetiyle doğrudan girebilir veya stüdyo Wi-Fi ağına bağlanabilirsiniz:</div>
    <div class="steps">
      <div class="step-card">
        <div class="step-num">DOĞRUDAN GİRİŞ (Wİ-Fİ GEREKMEZ)</div>
        <div class="step-title">FOTOĞRAF STÜDYOSUNU AÇIN</div>
        <div class="step-desc">Kendi mobil internetinizle veya Wi-Fi ile bu QR kodu okutun, arka plan seçip fotoğrafınızı çekin ve telefonunuza indirin:</div>
        <div class="qr-box">
          <img src="${githubPagesQrDataUrl}" alt="GitHub Pages Stüdyo QR Kodu" />
        </div>
        <div class="info-box">
          Web Adresi:<br/>
          <strong>${GITHUB_PAGES_URL}</strong>
        </div>
      </div>
      <div class="step-card">
        <div class="step-num">İSTEĞE BAĞLI: ÜCRETSİZ Wİ-Fİ</div>
        <div class="step-title">STÜDYO Wİ-Fİ AĞI</div>
        <div class="step-desc">İnternet paketiniz yoksa telefon kameranızla bu QR kodu okutarak yarışma Wi-Fi ağına bağlanabilirsiniz:</div>
        <div class="qr-box">
          <img src="${defaultWifiQrDataUrl}" alt="Wi-Fi QR Kodu" />
        </div>
        <div class="info-box">
          Ağ Adı (SSID): <strong>${DEFAULT_WIFI_SSID}</strong><br/>
          Şifre: <strong>${DEFAULT_WIFI_PASS}</strong>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(SITE_DIR, 'afis.html'), posterHtml, 'utf-8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'afis.html'), posterHtml, 'utf-8');
  fs.writeFileSync(path.join(PROJECT_ROOT, 'QR_Karsilama_Afisi.html'), posterHtml, 'utf-8');

  // .nojekyll dosyası (GitHub Pages'in özel dosyaları yoksaymaması için)
  fs.writeFileSync(path.join(SITE_DIR, '.nojekyll'), '', 'utf-8');

  console.log(`✅ GitHub Pages statik derlemesi tamamlandı (_site/):`);
  console.log(`   - Hedef Adres : ${GITHUB_PAGES_URL}`);
  console.log(`   - Arka Planlar: ${backgrounds.length} adet görsel eklendi`);
}

buildStaticSite().catch((err) => {
  console.error('Statik derleme hatası:', err);
  process.exit(1);
});
