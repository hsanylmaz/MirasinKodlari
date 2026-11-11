/**
 * Web Audio API tabanlı Stüdyo Ses Efektleri (Geri Sayım Bip & Deklanşör Sesi)
 * Harici ses dosyası gerektirmeden çevrimdışı çalışır.
 */
window.StudioAudio = (function () {
  let ctx = null;
  let muted = false;

  function getContext() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playCountdownBeep(isFinalStep) {
    const audio = getContext();
    if (!audio) return;

    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isFinalStep ? 880 : 587.33, audio.currentTime);

    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, audio.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + (isFinalStep ? 0.28 : 0.16));

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start();
    osc.stop(audio.currentTime + (isFinalStep ? 0.3 : 0.18));
  }

  function playShutterClick() {
    const audio = getContext();
    if (!audio) return;

    const bufferSize = audio.sampleRate * 0.12;
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audio.sampleRate * 0.025));
    }

    const noise = audio.createBufferSource();
    noise.buffer = buffer;

    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, audio.currentTime);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.45, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    noise.start();
  }

  function setMuted(state) {
    muted = Boolean(state);
  }

  function isMuted() {
    return muted;
  }

  return {
    playCountdownBeep,
    playShutterClick,
    setMuted,
    isMuted,
  };
})();
