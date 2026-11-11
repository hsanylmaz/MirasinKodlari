import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BackgroundItem, CapturedPhoto } from '../types/studio.types';

const ALLOWED_BG_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const MAX_BASE64_LENGTH = 25 * 1024 * 1024; // ~18MB image safety limit

export class StorageService {
  private readonly backgroundsDir: string;
  private readonly capturesDir: string;
  private readonly metadataPath: string;

  constructor(projectRoot: string) {
    this.backgroundsDir = path.join(projectRoot, 'arkaplanlar');
    this.capturesDir = path.join(projectRoot, 'kaydedilen_fotograflar');
    this.metadataPath = path.join(this.capturesDir, 'index.json');
    this.ensureDirectories();
  }

  public getBackgroundsDir(): string {
    return this.backgroundsDir;
  }

  public getCapturesDir(): string {
    return this.capturesDir;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.backgroundsDir)) {
      fs.mkdirSync(this.backgroundsDir, { recursive: true });
    }
    if (!fs.existsSync(this.capturesDir)) {
      fs.mkdirSync(this.capturesDir, { recursive: true });
    }
    if (!fs.existsSync(this.metadataPath)) {
      fs.writeFileSync(this.metadataPath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  public formatBackgroundTitle(fileName: string): string {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    const cleaned = base
      .replace(/^\d+[-_\s]*/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    return cleaned || base;
  }

  public listBackgrounds(): BackgroundItem[] {
    this.ensureDirectories();
    const entries = fs.readdirSync(this.backgroundsDir, { withFileTypes: true });
    const items: BackgroundItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_BG_EXTENSIONS.has(ext)) continue;

      const fullPath = path.join(this.backgroundsDir, entry.name);
      const stat = fs.statSync(fullPath);

      items.push({
        id: Buffer.from(entry.name).toString('base64url'),
        fileName: entry.name,
        title: this.formatBackgroundTitle(entry.name),
        url: `/arkaplanlar/${encodeURIComponent(entry.name)}`,
        updatedAt: stat.mtime.toISOString(),
      });
    }

    return items.sort((a, b) => a.fileName.localeCompare(b.fileName, 'tr'));
  }

  public saveUploadedBackground(fileName: string, dataUrl: string): BackgroundItem {
    this.ensureDirectories();
    if (!dataUrl || dataUrl.length > MAX_BASE64_LENGTH) {
      throw new Error('Görsel boyutu çok büyük veya geçersiz.');
    }

    const match = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,(.+)$/i.exec(dataUrl);
    if (!match) {
      throw new Error('Desteklenmeyen görsel formatı. PNG, JPG, WEBP veya SVG yükleyin.');
    }

    const mimeSubtype = match[1].toLowerCase();
    const base64Data = match[2];
    const extMap: Record<string, string> = {
      png: '.png',
      jpeg: '.jpg',
      jpg: '.jpg',
      webp: '.webp',
      'svg+xml': '.svg',
    };
    const ext = extMap[mimeSubtype] || '.png';

    const rawBase = path.basename(fileName, path.extname(fileName));
    const safeBase = this.sanitizeSlug(rawBase) || `Arkaplan_${Date.now()}`;
    const finalFileName = `${safeBase}${ext}`;
    const fullPath = path.join(this.backgroundsDir, finalFileName);

    fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
    const stat = fs.statSync(fullPath);

    return {
      id: Buffer.from(finalFileName).toString('base64url'),
      fileName: finalFileName,
      title: this.formatBackgroundTitle(finalFileName),
      url: `/arkaplanlar/${encodeURIComponent(finalFileName)}`,
      updatedAt: stat.mtime.toISOString(),
    };
  }

  public saveCapturedPhoto(params: {
    imageDataUrl: string;
    participantName?: string;
    teamName?: string;
    backgroundTitle?: string;
    baseUrl: string;
  }): CapturedPhoto {
    this.ensureDirectories();
    const { imageDataUrl, participantName = '', teamName = '', backgroundTitle = '', baseUrl } = params;

    if (!imageDataUrl || imageDataUrl.length > MAX_BASE64_LENGTH) {
      throw new Error('Geçersiz veya çok büyük fotoğraf verisi.');
    }

    const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(imageDataUrl);
    if (!match) {
      throw new Error('Fotoğraf verisi PNG veya JPEG formatında olmalıdır.');
    }

    const ext = match[1].toLowerCase() === 'png' ? '.png' : '.jpg';
    const buffer = Buffer.from(match[2], 'base64');

    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    const id = crypto.randomBytes(4).toString('hex');
    const namePart = this.sanitizeSlug(participantName || teamName || 'Ogrenci');
    const fileName = `MirasinKodlari_${timestamp}_${namePart}_${id}${ext}`;
    const fullPath = path.join(this.capturesDir, fileName);

    fs.writeFileSync(fullPath, buffer);

    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const record: CapturedPhoto = {
      id,
      fileName,
      participantName: participantName.trim(),
      teamName: teamName.trim(),
      backgroundTitle: backgroundTitle.trim() || 'Mirasın Kodları',
      createdAt: now.toISOString(),
      imageUrl: `/kaydedilen_fotograflar/${encodeURIComponent(fileName)}`,
      downloadUrl: `/api/photos/${id}/download`,
      mobilePageUrl: `${normalizedBase}/indir/${id}`,
    };

    const existing = this.readMetadata();
    existing.unshift(record);
    this.writeMetadata(existing.slice(0, 500));

    return record;
  }

  public listCapturedPhotos(baseUrl: string): CapturedPhoto[] {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const list = this.readMetadata();
    return list
      .filter((item) => fs.existsSync(path.join(this.capturesDir, path.basename(item.fileName))))
      .map((item) => ({
        ...item,
        mobilePageUrl: `${normalizedBase}/indir/${item.id}`,
      }));
  }

  public getPhotoById(id: string, baseUrl: string): CapturedPhoto | undefined {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    return this.listCapturedPhotos(baseUrl).find((p) => p.id === safeId);
  }

  public deletePhotoById(id: string): boolean {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const list = this.readMetadata();
    const target = list.find((p) => p.id === safeId);
    if (!target) return false;

    const fullPath = path.join(this.capturesDir, path.basename(target.fileName));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    const updated = list.filter((p) => p.id !== safeId);
    this.writeMetadata(updated);
    return true;
  }

  public getPhotoFilePath(fileName: string): string {
    const safeName = path.basename(fileName);
    return path.join(this.capturesDir, safeName);
  }

  private readMetadata(): CapturedPhoto[] {
    try {
      const raw = fs.readFileSync(this.metadataPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CapturedPhoto[]) : [];
    } catch {
      return [];
    }
  }

  private writeMetadata(items: CapturedPhoto[]): void {
    fs.writeFileSync(this.metadataPath, JSON.stringify(items, null, 2), 'utf-8');
  }

  private sanitizeSlug(input: string): string {
    const trMap: Record<string, string> = {
      ç: 'c',
      Ç: 'C',
      ğ: 'g',
      Ğ: 'G',
      ı: 'i',
      İ: 'I',
      ö: 'o',
      Ö: 'O',
      ş: 's',
      Ş: 'S',
      ü: 'u',
      Ü: 'U',
    };
    return input
      .trim()
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => trMap[ch] || ch)
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  }
}
