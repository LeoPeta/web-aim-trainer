// ====== Hit Sound (Web Audio API) ======
let audioCtx = null;

// Pre-warm audio system to avoid first-hit lag and silent shots
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playHitSound() {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  // Smooth short "pop" — clean and round
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.05);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}
