(function () {
  const WIFI_STORAGE_KEY = 'mirasin_kodlari_wifi_config';
  const GITHUB_PAGES_DEFAULT_URL = 'https://hsanylmaz.github.io/Mirasin_Kodlari/';

  const state = {
    isStaticHosting: false,
    staticConfig: null,
    backgrounds: [],
    selectedBg: null,
    bgImageCache: new Map(),
    staticSubjectImg: null,
    photos: [],
    networkInfo: null,
    selectedBaseUrl: GITHUB_PAGES_DEFAULT_URL,
    currentPhotoId: null,
    lastCapturedDataUrl: null,
    lastCapturedFileName: 'MirasinKodlari_Hatira.png',
    videoStream: null,
    currentFacingMode: 'user',
    isSimulation: true,
    isEyedropperMode: false,
    isCountingDown: false,
  };

  const els = {
    webcamVideo: document.getElementById('webcamVideo'),
    stageCanvas: document.getElementById('stageCanvas'),
    viewfinderShell: document.getElementById('viewfinderShell'),
    cameraStatusText: document.getElementById('cameraStatusText'),
    photoCountBadge: document.getElementById('photoCountBadge'),
    activeBgLabel: document.getElementById('activeBgLabel'),
    eyedropperBanner: document.getElementById('eyedropperBanner'),
    countdownOverlay: document.getElementById('countdownOverlay'),
    countdownNumber: document.getElementById('countdownNumber'),
    shutterFlash: document.getElementById('shutterFlash'),
    backgroundsList: document.getElementById('backgroundsList'),
    bgFileInput: document.getElementById('bgFileInput'),
    btnUploadBg: document.getElementById('btnUploadBg'),
    btnRefreshBgs: document.getElementById('btnRefreshBgs'),

    // Mobil / Telefon Kamera Elemanları
    mobileRearCameraInput: document.getElementById('mobileRearCameraInput'),
    mobileSelfieCameraInput: document.getElementById('mobileSelfieCameraInput'),
    mobileGalleryInput: document.getElementById('mobileGalleryInput'),
    btnFlipLiveCamera: document.getElementById('btnFlipLiveCamera'),
    btnMobileRearCam: document.getElementById('btnMobileRearCam'),
    btnMobileGallery: document.getElementById('btnMobileGallery'),
    btnBackToLiveVideo: document.getElementById('btnBackToLiveVideo'),
    btnQuickDownloadToDevice: document.getElementById('btnQuickDownloadToDevice'),
    btnDirectSaveSidebar: document.getElementById('btnDirectSaveSidebar'),

    // Yarışmacı & Chroma Key Kontrolleri
    inputParticipantName: document.getElementById('inputParticipantName'),
    inputTeamName: document.getElementById('inputTeamName'),
    chkShowFrame: document.getElementById('chkShowFrame'),
    inputKeyColor: document.getElementById('inputKeyColor'),
    btnPickColorFromVideo: document.getElementById('btnPickColorFromVideo'),
    btnResetChroma: document.getElementById('btnResetChroma'),
    sliderSimilarity: document.getElementById('sliderSimilarity'),
    valSimilarity: document.getElementById('valSimilarity'),
    sliderSmoothness: document.getElementById('sliderSmoothness'),
    valSmoothness: document.getElementById('valSmoothness'),
    sliderSpill: document.getElementById('sliderSpill'),
    valSpill: document.getElementById('valSpill'),
    chkShowRawGreen: document.getElementById('chkShowRawGreen'),
    selectCamera: document.getElementById('selectCamera'),
    selectTimer: document.getElementById('selectTimer'),
    chkMirror: document.getElementById('chkMirror'),
    btnCapturePhoto: document.getElementById('btnCapturePhoto'),

    // Üst Bar & Modallar
    btnOpenWifiStand: document.getElementById('btnOpenWifiStand'),
    btnOpenGallery: document.getElementById('btnOpenGallery'),
    btnToggleMute: document.getElementById('btnToggleMute'),
    btnFullscreen: document.getElementById('btnFullscreen'),

    // Giriş QR + Wi-Fi QR Panosu
    wifiStandModal: document.getElementById('wifiStandModal'),
    btnCloseWifiStand: document.getElementById('btnCloseWifiStand'),
    inputWifiSsid: document.getElementById('inputWifiSsid'),
    inputWifiPassword: document.getElementById('inputWifiPassword'),
    selectWifiEnc: document.getElementById('selectWifiEnc'),
    btnGenerateWifiQr: document.getElementById('btnGenerateWifiQr'),
    wifiQrPlaceholder: document.getElementById('wifiQrPlaceholder'),
    wifiQrImg: document.getElementById('wifiQrImg'),
    studioEntryQrImg: document.getElementById('studioEntryQrImg'),
    selectStandNetwork: document.getElementById('selectStandNetwork'),
    standStudioUrlText: document.getElementById('standStudioUrlText'),

    // Çekim Sonucu Modalı
    captureResultModal: document.getElementById('captureResultModal'),
    capturedPhotoImg: document.getElementById('capturedPhotoImg'),
    savedFilePathBadge: document.getElementById('savedFilePathBadge'),
    resultQrContainer: document.getElementById('resultQrContainer'),
    qrCodeImg: document.getElementById('qrCodeImg'),
    resultNetworkSelectorBlock: document.getElementById('resultNetworkSelectorBlock'),
    selectQrNetwork: document.getElementById('selectQrNetwork'),
    qrDirectLinkText: document.getElementById('qrDirectLinkText'),
    btnDirectDownload: document.getElementById('btnDirectDownload'),
    btnNativeSharePhoto: document.getElementById('btnNativeSharePhoto'),
    btnPrintPhoto: document.getElementById('btnPrintPhoto'),
    btnNewCapture: document.getElementById('btnNewCapture'),

    // Galeri Modalı
    galleryModal: document.getElementById('galleryModal'),
    galleryGrid: document.getElementById('galleryGrid'),
    btnCloseGallery: document.getElementById('btnCloseGallery'),
  };

  async function init() {
    bindEvents();
    if (navigator.canShare) {
      els.btnNativeSharePhoto.classList.remove('hidden');
    }
    await loadStaticFallbackConfig();
    await Promise.all([loadNetworkInfo(), loadBackgrounds(), loadPhotos()]);
    restoreSavedWifiConfig();
    await initCameraDevices();
    requestAnimationFrame(renderLoop);
  }

  async function loadStaticFallbackConfig() {
    try {
      const res = await fetch('./static-config.json');
      if (res.ok) {
        state.staticConfig = await res.json();
        if (state.staticConfig.defaultWifiQrDataUrl) {
          els.wifiQrImg.src = state.staticConfig.defaultWifiQrDataUrl;
          els.wifiQrImg.classList.remove('hidden');
        }
        if (state.staticConfig.githubPagesQrDataUrl) {
          els.studioEntryQrImg.src = state.staticConfig.githubPagesQrDataUrl;
        }
      }
    } catch {
      // ignore if not built yet
    }
  }

  async function loadNetworkInfo(customBaseUrl) {
    try {
      const query = customBaseUrl ? `?baseUrl=${encodeURIComponent(customBaseUrl)}` : '';
      const res = await fetch(`./api/network-info${query}`);
      if (!res.ok) throw new Error('Static mode');
      const json = await res.json();
      if (json.success && json.data) {
        state.isStaticHosting = false;
        state.networkInfo = json.data;
        state.selectedBaseUrl = json.data.studioUrl || json.data.recommendedBaseUrl;
        populateNetworkSelects();
        if (json.data.studioQrDataUrl) {
          els.studioEntryQrImg.src = json.data.studioQrDataUrl;
        }
        els.standStudioUrlText.textContent = state.selectedBaseUrl;
        return;
      }
    } catch {
      // GitHub Pages veya Statik Modda çalışıyor
      state.isStaticHosting = true;
      const pageUrl =
        window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost')
          ? window.location.origin + window.location.pathname
          : (state.staticConfig && state.staticConfig.githubPagesUrl) || GITHUB_PAGES_DEFAULT_URL;

      state.selectedBaseUrl = pageUrl;
      els.standStudioUrlText.textContent = pageUrl;

      [els.selectQrNetwork, els.selectStandNetwork].forEach((sel) => {
        if (!sel) return;
        sel.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = pageUrl;
        opt.textContent = `GitHub Pages (Wi-Fi Gerekmez): ${pageUrl}`;
        sel.appendChild(opt);
      });
    }
  }

  function populateNetworkSelects() {
    if (!state.networkInfo) return;
    const selects = [els.selectQrNetwork, els.selectStandNetwork];

    selects.forEach((sel) => {
      if (!sel) return;
      sel.innerHTML = '';
      const seen = new Set();

      const ghUrl = (state.staticConfig && state.staticConfig.githubPagesUrl) || GITHUB_PAGES_DEFAULT_URL;
      const ghOpt = document.createElement('option');
      ghOpt.value = ghUrl;
      ghOpt.textContent = `🌐 GitHub Pages (İnternet / Wi-Fi'siz): ${ghUrl}`;
      if (ghUrl === state.selectedBaseUrl) ghOpt.selected = true;
      sel.appendChild(ghOpt);
      seen.add(ghUrl);

      for (const iface of state.networkInfo.interfaces) {
        if (seen.has(iface.url)) continue;
        seen.add(iface.url);
        const opt = document.createElement('option');
        opt.value = iface.url;
        opt.textContent = `📡 Yerel Wi-Fi (${iface.name}): ${iface.url}`;
        if (iface.url === state.selectedBaseUrl) opt.selected = true;
        sel.appendChild(opt);
      }
    });
  }

  function restoreSavedWifiConfig() {
    try {
      const raw = localStorage.getItem(WIFI_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.ssid) els.inputWifiSsid.value = saved.ssid;
        if (saved.password) els.inputWifiPassword.value = saved.password;
        if (saved.encryption) els.selectWifiEnc.value = saved.encryption;
      }
      if (!state.isStaticHosting && els.inputWifiSsid.value.trim()) {
        generateWifiQrCode();
      }
    } catch {
      // ignore
    }
  }

  async function generateWifiQrCode() {
    const ssid = els.inputWifiSsid.value.trim();
    const password = els.inputWifiPassword.value;
    const encryption = els.selectWifiEnc.value;

    if (!ssid) {
      alert('Lütfen önce Wi-Fi Ağ Adını (SSID) yazın.');
      els.inputWifiSsid.focus();
      return;
    }

    try {
      localStorage.setItem(WIFI_STORAGE_KEY, JSON.stringify({ ssid, password, encryption }));
    } catch {
      // ignore
    }

    if (state.isStaticHosting) {
      if (
        state.staticConfig &&
        ssid === state.staticConfig.defaultWifiSsid &&
        password === state.staticConfig.defaultWifiPass &&
        state.staticConfig.defaultWifiQrDataUrl
      ) {
        els.wifiQrImg.src = state.staticConfig.defaultWifiQrDataUrl;
        els.wifiQrImg.classList.remove('hidden');
      }
      return;
    }

    try {
      const res = await fetch('./api/wifi-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid, password, encryption }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        els.wifiQrImg.src = json.data.qrDataUrl;
        els.wifiQrImg.classList.remove('hidden');
        els.wifiQrPlaceholder.classList.add('hidden');
      }
    } catch (err) {
      console.error('Wi-Fi QR hatası:', err);
    }
  }

  async function loadBackgrounds() {
    try {
      let res = await fetch('./api/backgrounds');
      if (!res.ok) {
        res = await fetch('./backgrounds.json');
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        state.backgrounds = json.data.map((item) => ({
          ...item,
          url: item.url.startsWith('/') ? `.${item.url}` : item.url,
        }));
        renderBackgroundsStrip();
        if (state.backgrounds.length > 0 && !state.selectedBg) {
          selectBackground(state.backgrounds[0]);
        } else if (state.selectedBg) {
          const stillExists = state.backgrounds.find((b) => b.fileName === state.selectedBg.fileName);
          if (stillExists) {
            selectBackground(stillExists);
          } else if (state.backgrounds.length > 0) {
            selectBackground(state.backgrounds[0]);
          }
        }
      }
    } catch (err) {
      console.error('Arka planlar yüklenemedi:', err);
    }
  }

  function renderBackgroundsStrip() {
    els.backgroundsList.innerHTML = '';
    if (state.backgrounds.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#9CA3AF; font-size:13px; padding:12px;';
      empty.textContent = 'arkaplanlar/ klasöründe henüz görsel yok. "+ Arka Plan Ekle" ile görsel seçebilirsiniz.';
      els.backgroundsList.appendChild(empty);
      els.activeBgLabel.textContent = 'SAHNE: YOK';
      return;
    }

    for (const bg of state.backgrounds) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bg-thumb-card' + (state.selectedBg && state.selectedBg.fileName === bg.fileName ? ' active' : '');
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', state.selectedBg && state.selectedBg.fileName === bg.fileName ? 'true' : 'false');

      const img = document.createElement('img');
      img.src = bg.url;
      img.alt = bg.title;
      img.loading = 'lazy';

      const cap = document.createElement('div');
      cap.className = 'bg-thumb-caption';
      cap.textContent = bg.title;

      btn.appendChild(img);
      btn.appendChild(cap);
      btn.addEventListener('click', () => selectBackground(bg));
      els.backgroundsList.appendChild(btn);
    }
  }

  function selectBackground(bg) {
    state.selectedBg = bg;
    els.activeBgLabel.textContent = `SAHNE: ${bg.title.toUpperCase()}`;

    if (!state.bgImageCache.has(bg.url)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bg.url;
      state.bgImageCache.set(bg.url, img);
    }

    const cards = els.backgroundsList.querySelectorAll('.bg-thumb-card');
    cards.forEach((card, idx) => {
      const item = state.backgrounds[idx];
      const isSelected = item && item.fileName === bg.fileName;
      card.classList.toggle('active', Boolean(isSelected));
      card.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  }

  async function loadPhotos() {
    if (state.isStaticHosting) {
      els.photoCountBadge.textContent = String(state.photos.length);
      return;
    }
    try {
      const res = await fetch('./api/photos');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        state.photos = json.data;
        els.photoCountBadge.textContent = String(state.photos.length);
      }
    } catch {
      // Static mode fallback
    }
  }

  async function initCameraDevices(preferredFacingMode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      enableSimulationMode('TELEFON KAMERA MODU AKTİF');
      return;
    }

    const facingMode = preferredFacingMode || state.currentFacingMode || 'user';
    state.currentFacingMode = facingMode;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      const isSelfie = facingMode === 'user';
      els.chkMirror.checked = isSelfie;
      window.ChromaEngine.updateConfig({ mirror: isSelfie });

      await attachCameraStream(stream);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      els.selectCamera.innerHTML = '';
      videoInputs.forEach((device, idx) => {
        const opt = document.createElement('option');
        opt.value = device.deviceId;
        opt.textContent = device.label || `Kamera ${idx + 1}`;
        els.selectCamera.appendChild(opt);
      });

      const simOpt = document.createElement('option');
      simOpt.value = 'simulation';
      simOpt.textContent = 'Demo Yeşil Perde Simülasyonu (Kamerasız Test)';
      els.selectCamera.appendChild(simOpt);
    } catch (err) {
      console.warn('Canlı kamera yerine Telefon Kamera / Demo modu aktif:', err);
      enableSimulationMode('TELEFON KAMERA / DEMO MOD');
    }
  }

  async function attachCameraStream(stream) {
    if (state.videoStream) {
      state.videoStream.getTracks().forEach((t) => t.stop());
    }
    state.videoStream = stream;
    state.staticSubjectImg = null;
    els.btnBackToLiveVideo.classList.add('hidden');
    els.webcamVideo.srcObject = stream;
    await els.webcamVideo.play().catch(() => {});
    state.isSimulation = false;
    els.cameraStatusText.textContent = 'CANLI KAMERA AKTİF';
  }

  function enableSimulationMode(statusLabel) {
    if (state.videoStream) {
      state.videoStream.getTracks().forEach((t) => t.stop());
      state.videoStream = null;
    }
    state.isSimulation = true;
    els.selectCamera.value = 'simulation';
    els.cameraStatusText.textContent = statusLabel || 'DEMO SİMÜLASYON AKTİF';
  }

  async function switchCameraSource(value) {
    state.staticSubjectImg = null;
    els.btnBackToLiveVideo.classList.add('hidden');

    if (value === 'simulation') {
      enableSimulationMode('DEMO SİMÜLASYON AKTİF');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: value },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      await attachCameraStream(stream);
    } catch (err) {
      console.error('Seçilen kamera başlatılamadı:', err);
      enableSimulationMode('KAMERA HATASI — DEMO MOD');
    }
  }

  function handleSubjectImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.staticSubjectImg = img;
        els.btnBackToLiveVideo.classList.remove('hidden');
        els.cameraStatusText.textContent = 'TELEFON FOTOĞRAFI İŞLENDİ';

        const autoGreen = window.ChromaEngine.autoDetectGreenFromImage(img);
        if (autoGreen && autoGreen.hex) {
          els.inputKeyColor.value = autoGreen.hex;
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderLoop(timestamp) {
    const bgImg = state.selectedBg ? state.bgImageCache.get(state.selectedBg.url) : null;
    window.ChromaEngine.renderFrame({
      targetCanvas: els.stageCanvas,
      videoElement: els.webcamVideo,
      staticSubjectImg: state.staticSubjectImg,
      backgroundImg: bgImg,
      isSimulation: state.isSimulation,
      timestamp,
    });
    requestAnimationFrame(renderLoop);
  }

  function setEyedropperMode(active) {
    state.isEyedropperMode = Boolean(active);
    els.viewfinderShell.classList.toggle('eyedropper-active', state.isEyedropperMode);
    els.eyedropperBanner.classList.toggle('hidden', !state.isEyedropperMode);
    window.ChromaEngine.updateConfig({
      showRawGreen: state.isEyedropperMode ? true : els.chkShowRawGreen.checked,
    });
  }

  function triggerBrowserDirectDownload(dataUrl, fileName) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName || `MirasinKodlari_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function shareCapturedPhotoNatively() {
    if (!state.lastCapturedDataUrl) return;
    try {
      const res = await fetch(state.lastCapturedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], state.lastCapturedFileName || 'MirasinKodlari_Hatira.png', {
        type: 'image/png',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Mirasın Kodları Hatıra Fotoğrafım',
          text: 'Mirasın Kodları Yarışması Hatıra Fotoğrafı',
          files: [file],
        });
      } else {
        triggerBrowserDirectDownload(state.lastCapturedDataUrl, state.lastCapturedFileName);
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        triggerBrowserDirectDownload(state.lastCapturedDataUrl, state.lastCapturedFileName);
      }
    }
  }

  async function executeCaptureAndSave({ skipCountdown, autoDownloadToDevice }) {
    if (state.isCountingDown) return;
    state.isCountingDown = true;
    els.btnCapturePhoto.disabled = true;

    const seconds = skipCountdown ? 0 : parseInt(els.selectTimer.value, 10) || 0;
    if (seconds > 0) {
      els.countdownOverlay.classList.remove('hidden');
      for (let remaining = seconds; remaining >= 1; remaining--) {
        els.countdownNumber.textContent = String(remaining);
        window.StudioAudio.playCountdownBeep(remaining === 1);
        await new Promise((r) => setTimeout(r, 950));
      }
      els.countdownOverlay.classList.add('hidden');
    }

    window.StudioAudio.playShutterClick();
    els.shutterFlash.classList.add('active');
    setTimeout(() => els.shutterFlash.classList.remove('active'), 180);

    try {
      const bgImg = state.selectedBg ? state.bgImageCache.get(state.selectedBg.url) : null;
      const imageDataUrl = window.ChromaEngine.renderHighResCapture({
        videoElement: els.webcamVideo,
        staticSubjectImg: state.staticSubjectImg,
        backgroundImg: bgImg,
        isSimulation: state.isSimulation,
      });

      const cleanName = (els.inputParticipantName.value || els.inputTeamName.value || 'Hatira')
        .trim()
        .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_-]+/g, '_');
      const fallbackFileName = `MirasinKodlari_${cleanName}_${Date.now()}.png`;

      state.lastCapturedDataUrl = imageDataUrl;
      state.lastCapturedFileName = fallbackFileName;

      if (!state.isStaticHosting) {
        const res = await fetch('./api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl,
            participantName: els.inputParticipantName.value,
            teamName: els.inputTeamName.value,
            backgroundTitle: state.selectedBg ? state.selectedBg.title : 'Mirasın Kodları',
            customBaseUrl: state.selectedBaseUrl,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const { photo, qrDataUrl } = json.data;
            state.currentPhotoId = photo.id;
            state.lastCapturedFileName = photo.fileName;
            await loadPhotos();

            if (autoDownloadToDevice) {
              triggerBrowserDirectDownload(imageDataUrl, photo.fileName);
            }

            showCaptureResultModal({
              imageUrl: photo.imageUrl,
              fileName: photo.fileName,
              downloadUrl: photo.downloadUrl,
              mobilePageUrl: photo.mobilePageUrl,
              qrDataUrl,
              savedOnServer: true,
            });
            return;
          }
        }
      }

      // GitHub Pages / Statik Mod (Tarayıcı İçi Doğrudan Kayıt & Paylaşım)
      const localPhotoRecord = {
        id: String(Date.now()),
        fileName: fallbackFileName,
        participantName: els.inputParticipantName.value,
        teamName: els.inputTeamName.value,
        backgroundTitle: state.selectedBg ? state.selectedBg.title : 'Mirasın Kodları',
        imageUrl: imageDataUrl,
        downloadUrl: imageDataUrl,
        mobilePageUrl: window.location.href,
      };
      state.photos.unshift(localPhotoRecord);
      els.photoCountBadge.textContent = String(state.photos.length);

      if (autoDownloadToDevice) {
        triggerBrowserDirectDownload(imageDataUrl, fallbackFileName);
      }

      showCaptureResultModal({
        imageUrl: imageDataUrl,
        fileName: fallbackFileName,
        downloadUrl: imageDataUrl,
        mobilePageUrl: window.location.href,
        qrDataUrl: (state.staticConfig && state.staticConfig.githubPagesQrDataUrl) || '',
        savedOnServer: false,
      });
    } catch (err) {
      console.error('Çekim hatası:', err);
      if (state.lastCapturedDataUrl) {
        triggerBrowserDirectDownload(state.lastCapturedDataUrl, state.lastCapturedFileName);
      }
    } finally {
      state.isCountingDown = false;
      els.btnCapturePhoto.disabled = false;
    }
  }

  function showCaptureResultModal({ imageUrl, fileName, downloadUrl, mobilePageUrl, qrDataUrl, savedOnServer }) {
    els.capturedPhotoImg.src = imageUrl;
    els.savedFilePathBadge.textContent = savedOnServer
      ? `✓ Bilgisayara yedeklendi: kaydedilen_fotograflar/${fileName}`
      : `✓ Fotoğrafınız hazır! Aşağıdaki butonla doğrudan telefonunuza/cihazınıza indirebilirsiniz.`;

    if (qrDataUrl && savedOnServer) {
      els.qrCodeImg.src = qrDataUrl;
      els.resultQrContainer.classList.remove('hidden');
      els.resultNetworkSelectorBlock.classList.remove('hidden');
      els.qrDirectLinkText.textContent = mobilePageUrl;
    } else {
      els.resultQrContainer.classList.add('hidden');
      els.resultNetworkSelectorBlock.classList.add('hidden');
    }

    els.btnDirectDownload.href = downloadUrl;
    els.btnDirectDownload.setAttribute('download', fileName);
    els.captureResultModal.classList.remove('hidden');
  }

  async function refreshQrForSelectedNetwork() {
    if (!state.currentPhotoId || state.isStaticHosting) return;
    try {
      const res = await fetch(
        `./api/photos/${encodeURIComponent(state.currentPhotoId)}/qr?baseUrl=${encodeURIComponent(state.selectedBaseUrl)}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        els.qrCodeImg.src = json.data.qrDataUrl;
        els.qrDirectLinkText.textContent = json.data.photo.mobilePageUrl;
      }
    } catch (err) {
      console.error('QR güncellenemedi:', err);
    }
  }

  function openGalleryModal() {
    els.galleryGrid.innerHTML = '';
    if (state.photos.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'color:#9CA3AF; font-size:14px; padding:16px 0;';
      empty.textContent = 'Henüz çekilmiş fotoğraf bulunmuyor.';
      els.galleryGrid.appendChild(empty);
    } else {
      for (const item of state.photos) {
        const card = document.createElement('div');
        card.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = item.imageUrl;
        img.alt = item.participantName || item.fileName;
        img.loading = 'lazy';

        const title = document.createElement('div');
        title.style.cssText = 'font-weight:700; font-size:13px; color:#F3F4F6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        title.textContent =
          [item.participantName, item.teamName].filter(Boolean).join(' • ') || item.backgroundTitle;

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex; gap:6px;';

        const btnView = document.createElement('button');
        btnView.type = 'button';
        btnView.className = 'btn btn-amber';
        btnView.style.cssText = 'flex:1; padding:6px; font-size:11px;';
        btnView.textContent = 'AÇ / İNDİR';
        btnView.addEventListener('click', () => {
          els.galleryModal.classList.add('hidden');
          state.lastCapturedDataUrl = item.imageUrl;
          state.lastCapturedFileName = item.fileName;
          showCaptureResultModal({
            imageUrl: item.imageUrl,
            fileName: item.fileName,
            downloadUrl: item.downloadUrl || item.imageUrl,
            mobilePageUrl: item.mobilePageUrl || window.location.href,
            qrDataUrl: '',
            savedOnServer: false,
          });
        });

        actions.appendChild(btnView);
        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(actions);
        els.galleryGrid.appendChild(card);
      }
    }
    els.galleryModal.classList.remove('hidden');
  }

  function bindEvents() {
    // Canlı Kamerayı Ön / Arka Değiştirme (Mobil HTTPS / GitHub Pages için)
    els.btnFlipLiveCamera.addEventListener('click', async () => {
      const nextFacing = state.currentFacingMode === 'user' ? 'environment' : 'user';
      await initCameraDevices(nextFacing);
    });

    // Telefon Kamerası & Galeri Girişleri
    els.btnMobileRearCam.addEventListener('click', () => els.mobileRearCameraInput.click());
    els.btnMobileGallery.addEventListener('click', () => els.mobileGalleryInput.click());

    [els.mobileRearCameraInput, els.mobileSelfieCameraInput, els.mobileGalleryInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (file) handleSubjectImageFile(file);
        input.value = '';
      });
    });

    els.btnBackToLiveVideo.addEventListener('click', () => {
      state.staticSubjectImg = null;
      els.btnBackToLiveVideo.classList.add('hidden');
      els.cameraStatusText.textContent = state.isSimulation ? 'DEMO SİMÜLASYON AKTİF' : 'CANLI KAMERA AKTİF';
    });

    // Doğrudan Cihaza / Telefona İndirme & Paylaşma Butonları
    els.btnQuickDownloadToDevice.addEventListener('click', () => {
      executeCaptureAndSave({ skipCountdown: true, autoDownloadToDevice: true });
    });
    els.btnDirectSaveSidebar.addEventListener('click', () => {
      executeCaptureAndSave({ skipCountdown: true, autoDownloadToDevice: true });
    });
    els.btnNativeSharePhoto.addEventListener('click', shareCapturedPhotoNatively);

    // Katılımcı / Takım Adı & Çerçeve
    els.inputParticipantName.addEventListener('input', () => {
      window.ChromaEngine.updateConfig({ participantName: els.inputParticipantName.value });
    });
    els.inputTeamName.addEventListener('input', () => {
      window.ChromaEngine.updateConfig({ teamName: els.inputTeamName.value });
    });
    els.chkShowFrame.addEventListener('change', () => {
      window.ChromaEngine.updateConfig({ showFrameOverlay: els.chkShowFrame.checked });
    });

    // Chroma Key Ayarları
    els.inputKeyColor.addEventListener('input', () => {
      window.ChromaEngine.updateConfig({ keyColorHex: els.inputKeyColor.value });
    });

    els.btnPickColorFromVideo.addEventListener('click', () => {
      setEyedropperMode(!state.isEyedropperMode);
    });

    els.stageCanvas.addEventListener('click', (e) => {
      if (!state.isEyedropperMode) return;
      const rect = els.stageCanvas.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      const sampled = window.ChromaEngine.sampleRawColorAtNormalizedPoint({
        videoElement: els.webcamVideo,
        staticSubjectImg: state.staticSubjectImg,
        isSimulation: state.isSimulation,
        normX,
        normY,
      });
      if (sampled) {
        els.inputKeyColor.value = sampled.hex;
      }
      setEyedropperMode(false);
    });

    els.sliderSimilarity.addEventListener('input', () => {
      const val = parseInt(els.sliderSimilarity.value, 10);
      els.valSimilarity.textContent = `${val}%`;
      window.ChromaEngine.updateConfig({ similarity: val / 100 });
    });

    els.sliderSmoothness.addEventListener('input', () => {
      const val = parseInt(els.sliderSmoothness.value, 10);
      els.valSmoothness.textContent = `${val}%`;
      window.ChromaEngine.updateConfig({ smoothness: val / 100 });
    });

    els.sliderSpill.addEventListener('input', () => {
      const val = parseInt(els.sliderSpill.value, 10);
      els.valSpill.textContent = `${val}%`;
      window.ChromaEngine.updateConfig({ spillSuppression: val / 100 });
    });

    els.chkShowRawGreen.addEventListener('change', () => {
      window.ChromaEngine.updateConfig({ showRawGreen: els.chkShowRawGreen.checked });
    });

    els.btnResetChroma.addEventListener('click', () => {
      els.inputKeyColor.value = '#18c338';
      els.sliderSimilarity.value = '34';
      els.valSimilarity.textContent = '34%';
      els.sliderSmoothness.value = '12';
      els.valSmoothness.textContent = '12%';
      els.sliderSpill.value = '45';
      els.valSpill.textContent = '45%';
      els.chkShowRawGreen.checked = false;
      window.ChromaEngine.updateConfig({
        keyColorHex: '#18c338',
        similarity: 0.34,
        smoothness: 0.12,
        spillSuppression: 0.45,
        showRawGreen: false,
      });
    });

    // Kamera & Ayna
    els.selectCamera.addEventListener('change', () => {
      switchCameraSource(els.selectCamera.value);
    });
    els.chkMirror.addEventListener('change', () => {
      window.ChromaEngine.updateConfig({ mirror: els.chkMirror.checked });
    });

    // Arka Plan Klasör Yenileme ve Yükleme
    els.btnRefreshBgs.addEventListener('click', async () => {
      els.btnRefreshBgs.textContent = '↻...';
      await loadBackgrounds();
      setTimeout(() => {
        els.btnRefreshBgs.textContent = '↻ YENİLE';
      }, 300);
    });

    els.btnUploadBg.addEventListener('click', () => {
      els.bgFileInput.click();
    });

    els.bgFileInput.addEventListener('change', () => {
      const file = els.bgFileInput.files && els.bgFileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || '');
        if (!state.isStaticHosting) {
          try {
            const res = await fetch('./api/backgrounds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                dataUrl,
              }),
            });
            if (res.ok) {
              const json = await res.json();
              if (json.success && json.data) {
                await loadBackgrounds();
                selectBackground(json.data);
                els.bgFileInput.value = '';
                return;
              }
            }
          } catch {
            // Fallback to client-side background addition
          }
        }

        // GitHub Pages / Tarayıcı İçi Anında Arka Plan Ekleme
        const localBg = {
          id: `custom_${Date.now()}`,
          fileName: file.name,
          title: file.name.replace(/\.[^.]+$/, ''),
          url: dataUrl,
          updatedAt: new Date().toISOString(),
        };
        state.backgrounds.push(localBg);
        renderBackgroundsStrip();
        selectBackground(localBg);
        els.bgFileInput.value = '';
      };
      reader.readAsDataURL(file);
    });

    // Giriş QR + Wi-Fi QR Panosu
    els.btnOpenWifiStand.addEventListener('click', () => {
      els.wifiStandModal.classList.remove('hidden');
    });
    els.btnCloseWifiStand.addEventListener('click', () => {
      els.wifiStandModal.classList.add('hidden');
    });
    els.btnGenerateWifiQr.addEventListener('click', generateWifiQrCode);

    els.selectStandNetwork.addEventListener('change', async () => {
      state.selectedBaseUrl = els.selectStandNetwork.value;
      if (
        state.staticConfig &&
        state.selectedBaseUrl === state.staticConfig.githubPagesUrl &&
        state.staticConfig.githubPagesQrDataUrl
      ) {
        els.studioEntryQrImg.src = state.staticConfig.githubPagesQrDataUrl;
        els.standStudioUrlText.textContent = state.selectedBaseUrl;
      } else {
        await loadNetworkInfo(state.selectedBaseUrl);
      }
    });

    // Sayaçlı Fotoğraf Çekimi ve Modallar
    els.btnCapturePhoto.addEventListener('click', () => {
      executeCaptureAndSave({ skipCountdown: false, autoDownloadToDevice: false });
    });

    els.btnNewCapture.addEventListener('click', () => {
      els.captureResultModal.classList.add('hidden');
    });

    els.btnPrintPhoto.addEventListener('click', () => {
      window.print();
    });

    els.selectQrNetwork.addEventListener('change', async () => {
      state.selectedBaseUrl = els.selectQrNetwork.value;
      await loadNetworkInfo(state.selectedBaseUrl);
      await refreshQrForSelectedNetwork();
    });

    els.btnOpenGallery.addEventListener('click', openGalleryModal);
    els.btnCloseGallery.addEventListener('click', () => {
      els.galleryModal.classList.add('hidden');
    });

    // Ses & Tam Ekran
    els.btnToggleMute.addEventListener('click', () => {
      const nextState = !window.StudioAudio.isMuted();
      window.StudioAudio.setMuted(nextState);
      els.btnToggleMute.textContent = nextState ? 'SES: KAPALI' : 'SES: AÇIK';
    });

    els.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Klavye Kısayolları
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        if (state.isEyedropperMode) setEyedropperMode(false);
        els.captureResultModal.classList.add('hidden');
        els.galleryModal.classList.add('hidden');
        els.wifiStandModal.classList.add('hidden');
        return;
      }

      if (!isInput && e.code === 'Space') {
        e.preventDefault();
        if (!els.captureResultModal.classList.contains('hidden')) {
          els.captureResultModal.classList.add('hidden');
        } else if (
          els.galleryModal.classList.contains('hidden') &&
          els.wifiStandModal.classList.contains('hidden')
        ) {
          executeCaptureAndSave({ skipCountdown: false, autoDownloadToDevice: false });
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
