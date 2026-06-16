// ====== Crosshair Settings ======
let crosshairColor = '#fff';
let crosshairLen = 5;
let crosshairGap = 0;
let crosshairBorder = 0;
let crosshairDot = 0;

const crosshairCanvas = document.getElementById('crosshairCanvas');
const crosshairCtx = crosshairCanvas.getContext('2d');
const previewCanvas = document.getElementById('crosshairPreview');
const previewCtx = previewCanvas.getContext('2d');

function initCrosshairCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  crosshairCanvas.width = w * dpr;
  crosshairCanvas.height = h * dpr;
  crosshairCanvas.style.width = w + 'px';
  crosshairCanvas.style.height = h + 'px';
  crosshairCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Preview canvas with DPR
  previewCanvas.width = 100 * dpr;
  previewCanvas.height = 100 * dpr;
  previewCanvas.style.width = '100px';
  previewCanvas.style.height = '100px';
  previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawCrosshair();
}

function drawCrosshairOnCtx(ctx, w, h) {
  const dpr = window.devicePixelRatio || 1;

  // Switch to physical pixel coordinate system for crisp rendering
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const cw = w * dpr;
  const ch = h * dpr;
  const cx = Math.round(cw / 2);
  const cy = Math.round(ch / 2);

  // All sizes in physical pixels.
  // Force even widths so line/dot can perfectly center on integer cx/cy
  // (avoids the odd-pixel offset / asymmetry problem).
  const toEven = (n) => Math.max(2, Math.round(n / 2) * 2);
  const lw = toEven(2 * dpr);                            // line width (always even)
  const len = Math.round(crosshairLen * dpr);            // line length
  const gap = Math.round(crosshairGap * dpr);            // gap from center
  const bw = Math.round(crosshairBorder * dpr);          // border thickness
  const dotSize = crosshairDot > 0 ? toEven(crosshairDot * dpr) : 0;
  const halfLw = lw / 2;
  const halfDot = dotSize / 2;

  ctx.clearRect(0, 0, cw, ch);

  // Draw black border first (extends every element outward by bw)
  if (bw > 0) {
    ctx.fillStyle = '#000';
    // Top
    ctx.fillRect(cx - halfLw - bw, cy - gap - len - bw, lw + 2 * bw, len + 2 * bw);
    // Bottom
    ctx.fillRect(cx - halfLw - bw, cy + gap - bw, lw + 2 * bw, len + 2 * bw);
    // Left
    ctx.fillRect(cx - gap - len - bw, cy - halfLw - bw, len + 2 * bw, lw + 2 * bw);
    // Right
    ctx.fillRect(cx + gap - bw, cy - halfLw - bw, len + 2 * bw, lw + 2 * bw);
    // Center dot border
    if (dotSize > 0) {
      ctx.fillRect(cx - halfDot - bw, cy - halfDot - bw, dotSize + 2 * bw, dotSize + 2 * bw);
    }
  }

  // Draw inner color
  ctx.fillStyle = crosshairColor;
  // Top
  ctx.fillRect(cx - halfLw, cy - gap - len, lw, len);
  // Bottom
  ctx.fillRect(cx - halfLw, cy + gap, lw, len);
  // Left
  ctx.fillRect(cx - gap - len, cy - halfLw, len, lw);
  // Right
  ctx.fillRect(cx + gap, cy - halfLw, len, lw);

  // Center dot
  if (dotSize > 0) {
    ctx.fillRect(cx - halfDot, cy - halfDot, dotSize, dotSize);
  }

  // Restore CSS pixel coordinate system
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCrosshair() {
  drawCrosshairOnCtx(crosshairCtx, window.innerWidth, window.innerHeight);
  drawCrosshairOnCtx(previewCtx, 100, 100);
}

function setCrosshairColor(color, btn) {
  crosshairColor = color;
  const btns = document.getElementById('crosshairColorBtns').querySelectorAll('button');
  btns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  drawCrosshair();
  savePreferences();
}

function setCrosshairLen(val) {
  crosshairLen = parseInt(val);
  document.getElementById('crosshairLenVal').textContent = crosshairLen + 'px';
  drawCrosshair();
  savePreferences();
}

function setCrosshairGap(val) {
  crosshairGap = parseInt(val);
  document.getElementById('crosshairGapVal').textContent = crosshairGap + 'px';
  drawCrosshair();
  savePreferences();
}

function setCrosshairBorder(val) {
  crosshairBorder = parseInt(val);
  document.getElementById('crosshairBorderVal').textContent = crosshairBorder + 'px';
  drawCrosshair();
  savePreferences();
}

function setCrosshairDot(val) {
  crosshairDot = parseInt(val);
  document.getElementById('crosshairDotVal').textContent = crosshairDot + 'px';
  drawCrosshair();
  savePreferences();
}

initCrosshairCanvas();
