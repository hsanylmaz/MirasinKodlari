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
  : 'MirasinKodlari';
const GITHUB_PAGES_URL = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/`;

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

  // 3. GitHub Pages Stüdyo Giriş QR kodunu üret
  const githubPagesQrDataUrl = await QRCode.toDataURL(GITHUB_PAGES_URL, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 420,
    color: { dark: '#090A0C', light: '#FFFFFF' },
  });

  const staticConfig = {
    isStaticBuild: true,
    githubUsername: GITHUB_USERNAME,
    repoName: REPO_NAME,
    githubPagesUrl: GITHUB_PAGES_URL,
    githubPagesQrDataUrl,
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
      max-width: 640px;
      background: #111318;
      border: 4px solid #F59E0B;
      padding: 40px 32px;
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
      font-size: 32px;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: #D1D5DB;
      font-size: 16px;
      margin-bottom: 26px;
    }
    .step-card {
      background: #181B22;
      border: 2px solid #262A34;
      padding: 28px 24px;
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
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 8px;
      color: #F59E0B;
    }
    .step-desc {
      font-size: 15px;
      color: #D1D5DB;
      margin-bottom: 20px;
      line-height: 1.5;
      max-width: 460px;
    }
    .qr-box {
      background: #FFFFFF;
      padding: 16px;
      border: 4px solid #F59E0B;
      width: 300px;
      height: 300px;
      margin-bottom: 20px;
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
      font-size: 14px;
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
    <div class="subtitle">Telefon kameranızla aşağıdaki QR kodu okutarak doğrudan stüdyoya bağlanabilirsiniz:</div>
    <div class="step-card">
      <div class="step-num">TELEFON KAMERANIZLA OKUTUN</div>
      <div class="step-title">FOTOĞRAF STÜDYOSUNU AÇIN</div>
      <div class="step-desc">QR kodu okutun, yarışma arka planınızı seçip yeşil perde önünde fotoğrafınızı çekin ve doğrudan telefonunuza indirin:</div>
      <div class="qr-box">
        <img src="${githubPagesQrDataUrl}" alt="Mirasın Kodları Stüdyo QR Kodu" />
      </div>
      <div class="info-box">
        Web Adresi:<br/>
        <strong>${GITHUB_PAGES_URL}</strong>
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
