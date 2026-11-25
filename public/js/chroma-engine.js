/**
 * Mirasın Kodları — Gerçek Zamanlı Chroma Key (Yeşil Perde) ve Kompozisyon Motoru
 * Hem Canlı Kamera (Webcam / Mobil Kamera) hem de Telefon Kamerasıyla Çekilen Fotoğraf (Static Subject) desteklidir.
 */
window.ChromaEngine = (function () {
  const OUTPUT_WIDTH = 1920;
  const OUTPUT_HEIGHT = 1080;
  const PROCESS_WIDTH = 960;
  const PROCESS_HEIGHT = 540;

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = PROCESS_WIDTH;
  offscreenCanvas.height = PROCESS_HEIGHT;
  const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

  const simCanvas = document.createElement('canvas');
  simCanvas.width = PROCESS_WIDTH;
  simCanvas.height = PROCESS_HEIGHT;
  const simCtx = simCanvas.getContext('2d');

  const config = {
    enabled: true,
    keyColor: { r: 24, g: 195, b: 56 }, // Varsayılan yeşil perde rengi
    similarity: 0.34,                    // 0.05 - 0.80 arası tolerans
    smoothness: 0.12,                    // 0.01 - 0.40 arası kenar geçiş yumuşaklığı
    spillSuppression: 0.45,              // 0.00 - 1.00 arası yeşil yansıma temizliği
    mirror: true,
    showRawGreen: false,
    showFrameOverlay: true,
    subjectFitMode: 'fit', // 'fit' (doğal 1x, yakınlaştırmasız) veya 'cover' (dolu)
    eventTitle: 'MİRASIN KODLARI',
    eventSubtitle: 'Dijital Yürüyüş STEM Hatırası',
    participantName: '',
    teamName: '',
  };

  function rgbToCbCr(r, g, b) {
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return { cb, cr };
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function rgbToHex(r, g, b) {
    return (
      '#' +
      [r, g, b]
        .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
        .join('')
    );
  }

  function drawSimulatedGreenScreenSubject(timestamp) {
    const w = PROCESS_WIDTH;
    const h = PROCESS_HEIGHT;
    simCtx.fillStyle = '#18C338';
    simCtx.fillRect(0, 0, w, h);

    const grad = simCtx.createRadialGradient(w * 0.5, h * 0.4, 30, w * 0.5, h * 0.5, w * 0.65);
    grad.addColorStop(0, 'rgba(40, 215, 70, 0.45)');
    grad.addColorStop(1, 'rgba(14, 155, 40, 0.55)');
    simCtx.fillStyle = grad;
    simCtx.fillRect(0, 0, w, h);

    const sway = Math.sin((timestamp || 0) * 0.0025) * 6;
    simCtx.save();
    simCtx.translate(w / 2 + sway, h);

    // Gövde
    simCtx.fillStyle = '#1E293B';
    simCtx.beginPath();
    simCtx.moveTo(-145, 0);
    simCtx.quadraticCurveTo(-135, -185, -55, -210);
    simCtx.lineTo(55, -210);
    simCtx.quadraticCurveTo(135, -185, 145, 0);
    simCtx.closePath();
    simCtx.fill();

    // Yaka Kartı
    simCtx.fillStyle = '#F59E0B';
    simCtx.fillRect(-32, -165, 64, 82);
    simCtx.fillStyle = '#090A0C';
    simCtx.font = 'bold 11px monospace';
    simCtx.textAlign = 'center';
    simCtx.fillText('YARIŞMACI', 0, -135);
    simCtx.fillStyle = '#F3F4F6';
    simCtx.fillText('DEMO MOD', 0, -112);

    // Boyun ve Baş
    simCtx.fillStyle = '#E6B89C';
    simCtx.fillRect(-24, -245, 48, 45);
    simCtx.beginPath();
    simCtx.arc(0, -295, 64, 0, Math.PI * 2);
    simCtx.fill();

    // Saç
    simCtx.fillStyle = '#111827';
    simCtx.beginPath();
    simCtx.arc(0, -310, 66, Math.PI, Math.PI * 2);
    simCtx.fill();

    // Gözlük ve Gülümseme
    simCtx.strokeStyle = '#090A0C';
    simCtx.lineWidth = 3.5;
    simCtx.strokeRect(-42, -312, 34, 22);
    simCtx.strokeRect(8, -312, 34, 22);
    simCtx.beginPath();
    simCtx.moveTo(-8, -301);
    simCtx.lineTo(8, -301);
    simCtx.stroke();

    simCtx.beginPath();
    simCtx.arc(0, -272, 20, 0.15 * Math.PI, 0.85 * Math.PI);
    simCtx.stroke();

    simCtx.restore();
    return simCanvas;
  }

  const greenScreenState = {
    detected: false,
    smoothMinX: 0,
    smoothMaxX: 1,
    smoothMinY: 0,
    smoothMaxY: 1,
  };

  function resetGreenScreenBounds() {
    greenScreenState.detected = false;
  }

  function applyChromaKeyToImageData(imageData) {
    const data = imageData.data;
    const imgW = imageData.width;
    const imgH = imageData.height;

    const keyR = config.keyColor.r;
    const keyG = config.keyColor.g;
    const keyB = config.keyColor.b;
    const keyCbCr = rgbToCbCr(keyR, keyG, keyB);

    const tol = Math.max(0.02, config.similarity) * 175;
    const smooth = Math.max(0.01, config.smoothness) * 135;
    const spill = config.spillSuppression;

    let minX = imgW;
    let maxX = 0;
    let minY = imgH;
    let maxY = 0;
    let greenCount = 0;

    const colGreen = new Uint16Array(imgW);
    const rowGreen = new Uint16Array(imgH);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const dCb = cb - keyCbCr.cb;
      const dCr = cr - keyCbCr.cr;
      const dist = Math.sqrt(dCb * dCb + dCr * dCr);

      let alpha = 1.0;
      if (dist < tol) {
        alpha = 0.0;
        const pIdx = i >> 2;
        const px = pIdx % imgW;
        const py = Math.floor(pIdx / imgW);
        colGreen[px]++;
        rowGreen[py]++;
        greenCount++;
      } else if (dist < tol + smooth) {
        alpha = (dist - tol) / smooth;
        if (alpha < 0.6) {
          const pIdx = i >> 2;
          const px = pIdx % imgW;
          const py = Math.floor(pIdx / imgW);
          colGreen[px]++;
          rowGreen[py]++;
          greenCount++;
        }
      }

      if (alpha > 0 && spill > 0) {
        const avgRB = (r + b) * 0.5;
        if (g > avgRB) {
          const excessG = (g - avgRB) * spill;
          data[i + 1] = Math.round(g - excessG);
        }
      }

      data[i + 3] = Math.round(alpha * 255);
    }

    // Yeşil perdenin sınırlarını histogram eşiğiyle parazitlerden arındırarak bul:
    const colThreshold = Math.max(5, Math.round(imgH * 0.06));
    const rowThreshold = Math.max(5, Math.round(imgW * 0.06));

    for (let x = 0; x < imgW; x++) {
      if (colGreen[x] >= colThreshold) {
        minX = x;
        break;
      }
    }
    for (let x = imgW - 1; x >= 0; x--) {
      if (colGreen[x] >= colThreshold) {
        maxX = x;
        break;
      }
    }
    for (let y = 0; y < imgH; y++) {
      if (rowGreen[y] >= rowThreshold) {
        minY = y;
        break;
      }
    }
    for (let y = imgH - 1; y >= 0; y--) {
      if (rowGreen[y] >= rowThreshold) {
        maxY = y;
        break;
      }
    }

    // En az %1.5 yeşil alan varsa ve dikdörtgen yeterince genişse yeşil perde alanını güncelle:
    if (greenCount > imgW * imgH * 0.015 && maxX > minX + 20 && maxY > minY + 20) {
      // Kenarlardan %1.5 hafif pay bırak (yeşil kumaş kenarlarına tam oturması için)
      let tMinX = Math.max(0, (minX / imgW) - 0.015);
      let tMaxX = Math.min(1, (maxX / imgW) + 0.015);
      let tMinY = Math.max(0, (minY / imgH) - 0.015);
      let tMaxY = Math.min(1, (maxY / imgH) + 0.015);

      if (!greenScreenState.detected) {
        greenScreenState.smoothMinX = tMinX;
        greenScreenState.smoothMaxX = tMaxX;
        greenScreenState.smoothMinY = tMinY;
        greenScreenState.smoothMaxY = tMaxY;
        greenScreenState.detected = true;
      } else {
        const factor = 0.14;
        greenScreenState.smoothMinX += (tMinX - greenScreenState.smoothMinX) * factor;
        greenScreenState.smoothMaxX += (tMaxX - greenScreenState.smoothMaxX) * factor;
        greenScreenState.smoothMinY += (tMinY - greenScreenState.smoothMinY) * factor;
        greenScreenState.smoothMaxY += (tMaxY - greenScreenState.smoothMaxY) * factor;
      }
    }
  }

  function drawBackgroundFittedToGreenScreen(ctx, bgImg, targetW, targetH) {
    if (!bgImg || !bgImg.complete || !bgImg.naturalWidth) {
      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, targetW, targetH);
      return;
    }

    // Arka planı koyu zeminle doldur
    ctx.fillStyle = '#090A0C';
    ctx.fillRect(0, 0, targetW, targetH);

    const srcW = bgImg.naturalWidth || bgImg.width;
    const srcH = bgImg.naturalHeight || bgImg.height;

    // Eğer yeşil perde tespit edildiyse, arka plan afişini tam yeşil perdenin sınırlarına oturt:
    if (greenScreenState.detected) {
      const gx = Math.round(greenScreenState.smoothMinX * targetW);
      const gy = Math.round(greenScreenState.smoothMinY * targetH);
      const gw = Math.round((greenScreenState.smoothMaxX - greenScreenState.smoothMinX) * targetW);
      const gh = Math.round((greenScreenState.smoothMaxY - greenScreenState.smoothMinY) * targetH);

      if (gw > 40 && gh > 40) {
        // Arka plan afişini yeşil perde alanının içine hiçbir yazı kesilmeyecek şekilde eksiksiz çiz:
        ctx.save();
        ctx.drawImage(bgImg, 0, 0, srcW, srcH, gx, gy, gw, gh);
        ctx.restore();
        return;
      }
    }

    // Yeşil perde henüz bulunamadıysa standart kaplama yap:
    drawCoverImage(ctx, bgImg, targetW, targetH, false);
  }

  function drawCoverImage(ctx, img, targetW, targetH, mirror) {
    const srcW = img.videoWidth || img.naturalWidth || img.width || targetW;
    const srcH = img.videoHeight || img.naturalHeight || img.height || targetH;
    if (!srcW || !srcH) return;

    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let sWidth = srcW;
    let sHeight = srcH;
    let sx = 0;
    let sy = 0;

    if (srcRatio > targetRatio) {
      sWidth = srcH * targetRatio;
      sx = (srcW - sWidth) * 0.5;
    } else {
      sHeight = srcW / targetRatio;
      sy = (srcH - sHeight) * 0.5;
    }

    ctx.save();
    if (mirror) {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
    ctx.restore();
  }

  function drawSubjectImage(ctx, img, targetW, targetH, mirror) {
    const srcW = img.videoWidth || img.naturalWidth || img.width || targetW;
    const srcH = img.videoHeight || img.naturalHeight || img.height || targetH;
    if (!srcW || !srcH) return;

    ctx.save();
    if (mirror) {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }

    const srcRatio = srcW / srcH;
    const targetRatio = targetW / targetH;

    // Eğer kullanıcı 'cover' (Dolu) modunu seçtiyse görüntüyü kırparak tüm canvas'ı kaplar:
    if (config.subjectFitMode === 'cover') {
      let sWidth = srcW;
      let sHeight = srcH;
      let sx = 0;
      let sy = 0;

      if (srcRatio > targetRatio) {
        sWidth = srcH * targetRatio;
        sx = (srcW - sWidth) * 0.5;
      } else {
        sHeight = srcW / targetRatio;
        sy = (srcH - sHeight) * 0.5;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
    } else {
      // DOĞAL 1X / GENİŞ AÇI MODU (VARSAYILAN):
      // Ön ve arka kamerada yüzün aşırı yakınlaşmasını (crop zoom) tamamen engeller.
      // Kameranın yüksekliğini ve genişliğini 100% koruyarak 16:9 canvas içerisine ortalar.
      // Kişi doğal mesafesinde görünür, etrafındaki yeşil perde silinerek yarışma arka planı görünür.
      const scale = Math.min(targetW / srcW, targetH / srcH);
      const destW = srcW * scale;
      const destH = srcH * scale;
      const destX = (targetW - destW) * 0.5;
      const destY = (targetH - destH) * 0.5;

      ctx.drawImage(img, 0, 0, srcW, srcH, destX, destY, destW, destH);
    }

    ctx.restore();
  }

  function drawCompetitionFrame(ctx, w, h) {
    if (!config.showFrameOverlay) return;

    const isPortrait = h > w;
    const scale = isPortrait ? w / 1080 : w / 1920;
    ctx.save();

    const bannerH = Math.round((isPortrait ? 124 : 118) * scale);
    const bannerY = h - bannerH;

    const grad = ctx.createLinearGradient(0, bannerY, 0, h);
    grad.addColorStop(0, 'rgba(9, 10, 12, 0.86)');
    grad.addColorStop(1, 'rgba(9, 10, 12, 0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY, w, bannerH);

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, bannerY, w, Math.max(2, Math.round(4 * scale)));

    const badgeW = Math.round(18 * scale);
    ctx.fillStyle = '#10B981';
    ctx.fillRect(Math.round(48 * scale), bannerY + Math.round(24 * scale), badgeW, bannerH - Math.round(48 * scale));

    ctx.fillStyle = '#F59E0B';
    ctx.font = `800 ${Math.round(34 * scale)}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(config.eventTitle || 'MİRASIN KODLARI', Math.round(84 * scale), bannerY + Math.round(22 * scale));

    ctx.fillStyle = '#D1D5DB';
    ctx.font = `600 ${Math.round(18 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillText(
      config.eventSubtitle || 'Dijital Yürüyüş STEM Hatırası',
      Math.round(84 * scale),
      bannerY + Math.round(66 * scale)
    );

    const pName = (config.participantName || '').trim();
    let tName = (config.teamName || '').trim();
    if (/^(seçim|secim|takım|takim)\s*(yapılmadı|yapilmadi|seçiniz|seciniz)?$/i.test(tName)) {
      tName = '';
    }
    const rightX = w - Math.round(56 * scale);
    ctx.textAlign = 'right';

    if (pName || tName) {
      const mainLabel = pName && tName ? `${pName} — ${tName}` : pName || tName;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${Math.round(30 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillText(mainLabel, rightX, bannerY + Math.round(24 * scale));

      const dateStr = new Date().toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      ctx.fillStyle = '#10B981';
      ctx.font = `600 ${Math.round(17 * scale)}px "JetBrains Mono", monospace`;
      ctx.fillText(dateStr.toUpperCase(), rightX, bannerY + Math.round(67 * scale));
    } else {
      const dateStr = new Date().toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      ctx.fillStyle = '#F3F4F6';
      ctx.font = `700 ${Math.round(24 * scale)}px "JetBrains Mono", monospace`;
      ctx.fillText(dateStr.toUpperCase(), rightX, bannerY + Math.round(42 * scale));
    }

    const cornerLen = Math.round(44 * scale);
    const pad = Math.round(28 * scale);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = Math.max(2, Math.round(3 * scale));

    ctx.beginPath();
    ctx.moveTo(pad, pad + cornerLen);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + cornerLen, pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - pad - cornerLen, pad);
    ctx.lineTo(w - pad, pad);
    ctx.lineTo(w - pad, pad + cornerLen);
    ctx.stroke();

    ctx.restore();
  }

  function resolveSourceElement({ videoElement, staticSubjectImg, isSimulation, timestamp }) {
    if (staticSubjectImg && staticSubjectImg.complete && staticSubjectImg.naturalWidth > 0) {
      return { elem: staticSubjectImg, shouldMirror: false };
    }
    if (isSimulation) {
      return { elem: drawSimulatedGreenScreenSubject(timestamp), shouldMirror: config.mirror };
    }
    return { elem: videoElement, shouldMirror: config.mirror };
  }

  function renderFrame({ targetCanvas, videoElement, staticSubjectImg, backgroundImg, isSimulation, timestamp }) {
    const ctx = targetCanvas.getContext('2d');
    const w = targetCanvas.width;
    const h = targetCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const { elem: sourceElem, shouldMirror } = resolveSourceElement({
      videoElement,
      staticSubjectImg,
      isSimulation,
      timestamp,
    });

    if (config.showRawGreen || !config.enabled) {
      if (sourceElem) {
        drawSubjectImage(ctx, sourceElem, w, h, shouldMirror);
      }
      return;
    }

    if (sourceElem) {
      // Offscreen canvas boyutlarını targetCanvas'ın en-boy oranına (aspect ratio) tam uyumlu hesapla:
      const procW = Math.round(w > 960 ? 960 : w);
      const procH = Math.round((h / w) * procW);

      if (offscreenCanvas.width !== procW || offscreenCanvas.height !== procH) {
        offscreenCanvas.width = procW;
        offscreenCanvas.height = procH;
      }

      offscreenCtx.clearRect(0, 0, procW, procH);
      drawSubjectImage(offscreenCtx, sourceElem, procW, procH, shouldMirror);
      const frameData = offscreenCtx.getImageData(0, 0, procW, procH);
      applyChromaKeyToImageData(frameData);
      offscreenCtx.putImageData(frameData, 0, 0);
    }

    // 1. Arka plan afişini her zaman yeşil perdenin sınırlarına tam sığacak şekilde çiz:
    drawBackgroundFittedToGreenScreen(ctx, backgroundImg, w, h);

    // 2. Şeffaflaştırılmış kamera görüntüsünü arka planın üzerine bas:
    if (sourceElem) {
      ctx.drawImage(offscreenCanvas, 0, 0, offscreenCanvas.width, offscreenCanvas.height, 0, 0, w, h);
    }

    drawCompetitionFrame(ctx, w, h);
  }

  const CAPTURE_PRESETS = {
    '16:9': { w: 1920, h: 1080 },
    '4:3':  { w: 1920, h: 1440 },
    '1:1':  { w: 1440, h: 1440 },
    '9:16': { w: 1080, h: 1920 },
  };

  function renderHighResCapture({
    videoElement,
    staticSubjectImg,
    backgroundImg,
    isSimulation,
    isPortrait = false,
    targetRatio = null,
  }) {
    let outW = 1920;
    let outH = 1080;

    if (targetRatio && CAPTURE_PRESETS[targetRatio]) {
      outW = CAPTURE_PRESETS[targetRatio].w;
      outH = CAPTURE_PRESETS[targetRatio].h;
    } else {
      outW = isPortrait ? 1080 : 1920;
      outH = isPortrait ? 1920 : 1080;
    }

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = outW;
    captureCanvas.height = outH;
    const ctx = captureCanvas.getContext('2d');

    const { elem: sourceElem, shouldMirror } = resolveSourceElement({
      videoElement,
      staticSubjectImg,
      isSimulation,
      timestamp: performance.now(),
    });

    let hiSubjectCanvas = null;
    if (sourceElem) {
      hiSubjectCanvas = document.createElement('canvas');
      hiSubjectCanvas.width = outW;
      hiSubjectCanvas.height = outH;
      const hiCtx = hiSubjectCanvas.getContext('2d', { willReadFrequently: true });

      drawSubjectImage(hiCtx, sourceElem, outW, outH, shouldMirror);
      if (config.enabled) {
        const frameData = hiCtx.getImageData(0, 0, outW, outH);
        applyChromaKeyToImageData(frameData);
        hiCtx.putImageData(frameData, 0, 0);
      }
    }

    // Arka plan afişini yüksek çözünürlükte tam yeşil perde sınırlarına oturt:
    drawBackgroundFittedToGreenScreen(ctx, backgroundImg, outW, outH);

    if (hiSubjectCanvas) {
      ctx.drawImage(hiSubjectCanvas, 0, 0);
    }

    drawCompetitionFrame(ctx, outW, outH);
    return captureCanvas.toDataURL('image/png');
  }

  function sampleRawColorAtNormalizedPoint({ videoElement, staticSubjectImg, isSimulation, normX, normY }) {
    const { elem: sourceElem, shouldMirror } = resolveSourceElement({
      videoElement,
      staticSubjectImg,
      isSimulation,
      timestamp: performance.now(),
    });
    if (!sourceElem) return null;

    const w = offscreenCanvas.width || PROCESS_WIDTH;
    const h = offscreenCanvas.height || PROCESS_HEIGHT;

    offscreenCtx.clearRect(0, 0, w, h);
    drawSubjectImage(offscreenCtx, sourceElem, w, h, shouldMirror);
    const px = Math.max(0, Math.min(w - 1, Math.floor(normX * w)));
    const py = Math.max(0, Math.min(h - 1, Math.floor(normY * h)));
    const pixel = offscreenCtx.getImageData(px, py, 1, 1).data;

    const picked = { r: pixel[0], g: pixel[1], b: pixel[2] };
    config.keyColor = picked;
    return {
      ...picked,
      hex: rgbToHex(picked.r, picked.g, picked.b),
    };
  }

  /**
   * Öğrenci telefon kamerasıyla fotoğraf çektiğinde fotoğrafın üst köşelerindeki
   * yeşil perde rengini otomatik tespit ederek telefonun beyaz dengesine uyum sağlar.
   */
  function autoDetectGreenFromImage(imgElement) {
    if (!imgElement) return null;
    offscreenCtx.clearRect(0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);
    drawCoverImage(offscreenCtx, imgElement, PROCESS_WIDTH, PROCESS_HEIGHT, false);
    const data = offscreenCtx.getImageData(0, 0, PROCESS_WIDTH, Math.floor(PROCESS_HEIGHT * 0.35)).data;

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (g > 75 && g > r * 1.25 && g > b * 1.2) {
        sumR += r;
        sumG += g;
        sumB += b;
        count++;
      }
    }

    if (count > 30) {
      const detected = {
        r: Math.round(sumR / count),
        g: Math.round(sumG / count),
        b: Math.round(sumB / count),
      };
      config.keyColor = detected;
      return {
        ...detected,
        hex: rgbToHex(detected.r, detected.g, detected.b),
      };
    }
    return null;
  }

  function updateConfig(partial) {
    Object.assign(config, partial);
    if (partial.keyColorHex) {
      config.keyColor = hexToRgb(partial.keyColorHex);
    }
  }

  function getConfig() {
    return {
      ...config,
      keyColorHex: rgbToHex(config.keyColor.r, config.keyColor.g, config.keyColor.b),
    };
  }

  return {
    renderFrame,
    renderHighResCapture,
    sampleRawColorAtNormalizedPoint,
    autoDetectGreenFromImage,
    resetGreenScreenBounds,
    updateConfig,
    getConfig,
  };
})();
