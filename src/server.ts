import express, { Request, Response } from 'express';
import path from 'path';
import QRCode from 'qrcode';
import { StorageService } from './services/storage.service';
import { getNetworkInfo } from './services/network.service';
import { createStudioRouter } from './routes/studio.routes';

const PORT = Number(process.env.PORT) || 3000;
const PROJECT_ROOT = path.resolve(__dirname, '..');

const app = express();
const storage = new StorageService(PROJECT_ROOT);

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Statik klasörler: Kiosk arayüzü, Arka Planlar ve Kaydedilen Fotoğraflar
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.use('/arkaplanlar', express.static(storage.getBackgroundsDir()));
app.use('/kaydedilen_fotograflar', express.static(storage.getCapturesDir()));

// Stüdyo API rotaları
app.use('/api', createStudioRouter(storage, PORT));

// Yazdırılabilir A4 Stüdyo Giriş QR Afişi (/afis)
app.get('/afis', async (req: Request, res: Response) => {
  const netInfo = getNetworkInfo(PORT, storage.getBackgroundsDir(), storage.getCapturesDir());
  const studioUrl = typeof req.query.url === 'string' && req.query.url.trim() ? req.query.url.trim() : netInfo.recommendedBaseUrl;

  const studioQr = await QRCode.toDataURL(studioUrl, { errorCorrectionLevel: 'M', margin: 2, width: 420 });

  res.send(`<!DOCTYPE html>
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
        <img src="${studioQr}" alt="Stüdyo Giriş QR Kodu" />
      </div>
      <div class="info-box">
        Stüdyo Adresi:<br/>
        <strong>${studioUrl}</strong>
      </div>
    </div>
  </div>
</body>
</html>`);
});

// Öğrencilerin QR kodu okuttuklarında telefonlarında açılacak Mobil İndirme Sayfası
app.get('/indir/:id', (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const netInfo = getNetworkInfo(PORT, storage.getBackgroundsDir(), storage.getCapturesDir());
  const photo = storage.getPhotoById(id, netInfo.recommendedBaseUrl);

  if (!photo) {
    res.status(404).send(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fotoğraf Bulunamadı — Mirasın Kodları</title>
  <style>
    body { background:#090A0C; color:#F3F4F6; font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100dvh; margin:0; padding:24px; text-align:center; }
    .box { border:2px solid #262A34; background:#111318; padding:32px; max-width:420px; }
    h1 { color:#F59E0B; margin-top:0; font-size:22px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>FOTOĞRAF BULUNAMADI</h1>
    <p>Aradığınız fotoğraf silinmiş veya bağlantı süresi dolmuş olabilir.</p>
  </div>
</body>
</html>`);
    return;
  }

  const escapeHtml = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const participantLabel = [photo.participantName, photo.teamName]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' • ');

  const formattedDate = new Date(photo.createdAt).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mirasın Kodları — Hatıra Fotoğrafınız</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      background: #090A0C;
      color: #F3F4F6;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 16px 40px;
    }
    .card {
      width: 100%;
      max-width: 520px;
      background: #111318;
      border: 2px solid #262A34;
      padding: 20px;
    }
    .badge {
      display: inline-block;
      background: rgba(245, 158, 11, 0.14);
      color: #F59E0B;
      border: 1px solid rgba(245, 158, 11, 0.4);
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 6px 10px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 24px;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }
    .meta {
      font-size: 14px;
      color: #9CA3AF;
      margin-bottom: 16px;
    }
    .photo-frame {
      width: 100%;
      border: 2px solid #F59E0B;
      background: #000;
      overflow: hidden;
      margin-bottom: 18px;
    }
    .photo-frame img {
      display: block;
      width: 100%;
      height: auto;
    }
    .btn-download {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      background: #F59E0B;
      color: #090A0C;
      font-weight: 800;
      font-size: 16px;
      text-decoration: none;
      padding: 16px;
      border: none;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .btn-download:active {
      transform: translateY(1px);
      background: #D97706;
    }
    .tip {
      margin-top: 14px;
      padding: 12px;
      background: #181B22;
      border-left: 3px solid #10B981;
      font-size: 13px;
      color: #D1D5DB;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">MİRASIN KODLARI // HATIRA STÜDYOSU</div>
    <h1>${participantLabel || 'Yarışma Hatıra Fotoğrafınız'}</h1>
    <div class="meta">Sahne: ${escapeHtml(photo.backgroundTitle)} • ${escapeHtml(formattedDate)}</div>
    <div class="photo-frame">
      <img src="${photo.imageUrl}" alt="Mirasın Kodları Hatıra Fotoğrafı" />
    </div>
    <a class="btn-download" href="${photo.downloadUrl}" download="${escapeHtml(photo.fileName)}">
      ⬇ FOTOĞRAFI TELEFONUMA İNDİR
    </a>
    <div class="tip">
      <strong>İpucu (iPhone / Android):</strong> Yukarıdaki butona dokunarak doğrudan indirebilir veya fotoğrafın üzerine <strong>basılı tutup "Fotoğraflara Kaydet"</strong> seçeneğini kullanabilirsiniz.
    </div>
  </main>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  const net = getNetworkInfo(PORT, storage.getBackgroundsDir(), storage.getCapturesDir());
  console.log('============================================================');
  console.log(' MİRASIN KODLARI — YEŞİL PERDE (CHROMA KEY) STÜDYOSU AKTİF');
  console.log('============================================================');
  console.log(` -> Bu Bilgisayarda Aç (Kiosk): http://localhost:${PORT}`);
  console.log(` -> QR / Mobil İndirme Adresi : ${net.recommendedBaseUrl}`);
  console.log(` -> Arka Plan Klasörü         : ${storage.getBackgroundsDir()}`);
  console.log(` -> Kaydedilen Fotoğraflar    : ${storage.getCapturesDir()}`);
  console.log('============================================================');
});
