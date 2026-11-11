import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { StorageService } from '../services/storage.service';
import { getNetworkInfo } from '../services/network.service';
import { SavePhotoRequest, WifiQrRequest } from '../types/studio.types';

function escapeWifiField(val: string): string {
  return val.replace(/([\\;,"':])/g, '\\$1');
}

export function createStudioRouter(storage: StorageService, port: number): Router {
  const router = Router();

  const resolveBaseUrl = (customBaseUrl?: string): string => {
    if (customBaseUrl && /^https?:\/\/[^\s/]+/i.test(customBaseUrl.trim())) {
      return customBaseUrl.trim().replace(/\/+$/, '');
    }
    const net = getNetworkInfo(port, storage.getBackgroundsDir(), storage.getCapturesDir());
    return net.recommendedBaseUrl;
  };

  router.get('/network-info', async (req: Request, res: Response) => {
    try {
      const info = getNetworkInfo(port, storage.getBackgroundsDir(), storage.getCapturesDir());
      const customBaseUrl = typeof req.query.baseUrl === 'string' ? req.query.baseUrl : undefined;
      const studioUrl = resolveBaseUrl(customBaseUrl);
      const studioQrDataUrl = await QRCode.toDataURL(studioUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
        color: {
          dark: '#090A0C',
          light: '#FFFFFF',
        },
      });
      res.json({
        success: true,
        data: {
          ...info,
          studioUrl,
          studioQrDataUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ağ bilgisi alınamadı.';
      res.status(500).json({ success: false, error: message });
    }
  });

  router.post('/wifi-qr', async (req: Request, res: Response) => {
    try {
      const body = req.body as WifiQrRequest;
      const ssid = (body?.ssid || '').trim();
      if (!ssid) {
        res.status(400).json({ success: false, error: 'Wi-Fi ağ adı (SSID) zorunludur.' });
        return;
      }

      const encryption = body.encryption || 'WPA';
      const password = body.password || '';
      const hidden = body.hidden ? 'true' : 'false';

      const wifiPayload = `WIFI:T:${encryption};S:${escapeWifiField(ssid)};P:${escapeWifiField(password)};H:${hidden};;`;
      const qrDataUrl = await QRCode.toDataURL(wifiPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
        color: {
          dark: '#090A0C',
          light: '#FFFFFF',
        },
      });

      res.json({
        success: true,
        data: {
          ssid,
          encryption,
          wifiPayload,
          qrDataUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wi-Fi QR kodu oluşturulamadı.';
      res.status(500).json({ success: false, error: message });
    }
  });

  router.get('/backgrounds', (_req: Request, res: Response) => {
    try {
      const items = storage.listBackgrounds();
      res.json({
        success: true,
        data: items,
        folderPath: storage.getBackgroundsDir(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Arka planlar okunamadı.';
      res.status(500).json({ success: false, error: message });
    }
  });

  router.post('/backgrounds', (req: Request, res: Response) => {
    try {
      const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
      if (!fileName || !dataUrl) {
        res.status(400).json({ success: false, error: 'Dosya adı ve görsel verisi zorunludur.' });
        return;
      }
      const saved = storage.saveUploadedBackground(fileName, dataUrl);
      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Arka plan kaydedilemedi.';
      res.status(400).json({ success: false, error: message });
    }
  });

  router.get('/photos', (req: Request, res: Response) => {
    try {
      const customBaseUrl = typeof req.query.baseUrl === 'string' ? req.query.baseUrl : undefined;
      const baseUrl = resolveBaseUrl(customBaseUrl);
      const photos = storage.listCapturedPhotos(baseUrl);
      res.json({
        success: true,
        data: photos,
        capturesDir: storage.getCapturesDir(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fotoğraflar listelenemedi.';
      res.status(500).json({ success: false, error: message });
    }
  });

  router.post('/photos', async (req: Request, res: Response) => {
    try {
      const body = req.body as SavePhotoRequest;
      if (!body || !body.imageDataUrl) {
        res.status(400).json({ success: false, error: 'Fotoğraf verisi (imageDataUrl) eksik.' });
        return;
      }

      const baseUrl = resolveBaseUrl(body.customBaseUrl);
      const photo = storage.saveCapturedPhoto({
        imageDataUrl: body.imageDataUrl,
        participantName: body.participantName,
        teamName: body.teamName,
        backgroundTitle: body.backgroundTitle,
        baseUrl,
      });

      const qrDataUrl = await QRCode.toDataURL(photo.mobilePageUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 360,
        color: {
          dark: '#090A0C',
          light: '#FFFFFF',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          photo,
          qrDataUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fotoğraf kaydedilemedi.';
      res.status(400).json({ success: false, error: message });
    }
  });

  router.get('/photos/:id/qr', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const customBaseUrl = typeof req.query.baseUrl === 'string' ? req.query.baseUrl : undefined;
      const baseUrl = resolveBaseUrl(customBaseUrl);
      const photo = storage.getPhotoById(id, baseUrl);

      if (!photo) {
        res.status(404).json({ success: false, error: 'Fotoğraf bulunamadı.' });
        return;
      }

      const qrDataUrl = await QRCode.toDataURL(photo.mobilePageUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 360,
        color: {
          dark: '#090A0C',
          light: '#FFFFFF',
        },
      });

      res.json({
        success: true,
        data: {
          photo,
          qrDataUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QR kod oluşturulamadı.';
      res.status(500).json({ success: false, error: message });
    }
  });

  router.get('/photos/:id/download', (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    const baseUrl = resolveBaseUrl();
    const photo = storage.getPhotoById(id, baseUrl);

    if (!photo) {
      res.status(404).send('Fotoğraf bulunamadı.');
      return;
    }

    const filePath = storage.getPhotoFilePath(photo.fileName);
    res.download(filePath, photo.fileName);
  });

  router.delete('/photos/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    const deleted = storage.deletePhotoById(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Silinecek fotoğraf bulunamadı.' });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
