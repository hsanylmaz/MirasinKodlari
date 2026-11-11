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
    eventTitle: 'MİRASIN KODLARI',
    eventSubtitle: 'YAZILIM & TEKNOLOJİ YARIŞMASI HATIRASI',
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

  function applyChromaKeyToImageData(imageData) {
    const data = imageData.data;
    const keyR = config.keyColor.r;
    const keyG = config.keyColor.g;
    const keyB = config.keyColor.b;
    const keyCbCr = rgbToCbCr(keyR, keyG, keyB);

    const tol = Math.max(0.02, config.similarity) * 175;
    const smooth = Math.max(0.01, config.smoothness) * 135;
    const spill = config.spillSuppression;

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
      } else if (dist < tol + smooth) {
        alpha = (dist - tol) / smooth;
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

  function drawCompetitionFrame(ctx, w, h) {
    if (!config.showFrameOverlay) return;

    const scale = w / 1920;
    ctx.save();

    const bannerH = Math.round(118 * scale);
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
      config.eventSubtitle || 'YAZILIM & TEKNOLOJİ YARIŞMASI HATIRASI',
      Math.round(84 * scale),
      bannerY + Math.round(66 * scale)
    );

    const pName = (config.participantName || '').trim();
    const tName = (config.teamName || '').trim();
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
        drawCoverImage(ctx, sourceElem, w, h, shouldMirror);
      }
      return;
    }

    if (backgroundImg && backgroundImg.complete && backgroundImg.naturalWidth > 0) {
      drawCoverImage(ctx, backgroundImg, w, h, false);
    } else {
      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, w, h);
    }

    if (sourceElem) {
      offscreenCtx.clearRect(0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);
      drawCoverImage(offscreenCtx, sourceElem, PROCESS_WIDTH, PROCESS_HEIGHT, shouldMirror);
      const frameData = offscreenCtx.getImageData(0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);
      applyChromaKeyToImageData(frameData);
      offscreenCtx.putImageData(frameData, 0, 0);

      ctx.drawImage(offscreenCanvas, 0, 0, PROCESS_WIDTH, PROCESS_HEIGHT, 0, 0, w, h);
    }

    drawCompetitionFrame(ctx, w, h);
  }

  function renderHighResCapture({ videoElement, staticSubjectImg, backgroundImg, isSimulation }) {
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = OUTPUT_WIDTH;
    captureCanvas.height = OUTPUT_HEIGHT;
    const ctx = captureCanvas.getContext('2d');

    const { elem: sourceElem, shouldMirror } = resolveSourceElement({
      videoElement,
      staticSubjectImg,
      isSimulation,
      timestamp: performance.now(),
    });

    if (backgroundImg && backgroundImg.complete && backgroundImg.naturalWidth > 0) {
      drawCoverImage(ctx, backgroundImg, OUTPUT_WIDTH, OUTPUT_HEIGHT, false);
    } else {
      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    }

    if (sourceElem) {
      const hiSubjectCanvas = document.createElement('canvas');
      hiSubjectCanvas.width = OUTPUT_WIDTH;
      hiSubjectCanvas.height = OUTPUT_HEIGHT;
      const hiCtx = hiSubjectCanvas.getContext('2d', { willReadFrequently: true });

      drawCoverImage(hiCtx, sourceElem, OUTPUT_WIDTH, OUTPUT_HEIGHT, shouldMirror);
      if (config.enabled) {
        const frameData = hiCtx.getImageData(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
        applyChromaKeyToImageData(frameData);
        hiCtx.putImageData(frameData, 0, 0);
      }
      ctx.drawImage(hiSubjectCanvas, 0, 0);
    }

    drawCompetitionFrame(ctx, OUTPUT_WIDTH, OUTPUT_HEIGHT);
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

    offscreenCtx.clearRect(0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);
    drawCoverImage(offscreenCtx, sourceElem, PROCESS_WIDTH, PROCESS_HEIGHT, shouldMirror);
    const px = Math.max(0, Math.min(PROCESS_WIDTH - 1, Math.floor(normX * PROCESS_WIDTH)));
    const py = Math.max(0, Math.min(PROCESS_HEIGHT - 1, Math.floor(normY * PROCESS_HEIGHT)));
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
    updateConfig,
    getConfig,
  };
})();
