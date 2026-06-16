// ====== Chart Drawing ======
const chartCanvas = document.getElementById('chartCanvas');
const chartCtx = chartCanvas.getContext('2d');
const chartCanvasAcc = document.getElementById('chartCanvasAcc');
const chartCtxAcc = chartCanvasAcc.getContext('2d');
let chartPoints = []; // store point positions for tooltip (score chart)
let chartAccPoints = []; // store point positions for tooltip (accuracy chart)

function drawChart(records) {
  const dpr = window.devicePixelRatio || 1;
  const cw = 360, ch = 180;
  chartCanvas.width = cw * dpr;
  chartCanvas.height = ch * dpr;
  chartCanvas.style.width = cw + 'px';
  chartCanvas.style.height = ch + 'px';
  chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padL = 50, padR = 20, padT = 15, padB = 25;
  const plotW = cw - padL - padR;
  const plotH = ch - padT - padB;

  chartCtx.clearRect(0, 0, cw, ch);
  chartPoints = [];

  // Filter out legacy records without generalScore, show last 20 only
  const allValid = records.filter(r => typeof r.generalScore === 'number');
  const validRecords = allValid.slice(-20);

  if (validRecords.length === 0) {
    chartCanvas.style.display = 'none';
    return;
  }
  chartCanvas.style.display = 'block';

  // Y-axis: general score, dynamic range
  let scoreMin = Infinity, scoreMax = -Infinity;
  for (const r of validRecords) {
    if (r.generalScore < scoreMin) scoreMin = r.generalScore;
    if (r.generalScore > scoreMax) scoreMax = r.generalScore;
  }
  // If only one point or all same, expand range
  if (scoreMin === scoreMax) {
    scoreMin = Math.max(0, scoreMin - 500);
    scoreMax += 500;
  }
  // Add 10% padding, clamp min to 0
  const scorePad = (scoreMax - scoreMin) * 0.1;
  scoreMin = Math.max(0, scoreMin - scorePad);
  scoreMax = scoreMax + scorePad;

  // Draw grid
  chartCtx.strokeStyle = '#2a2a2a';
  chartCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + plotH * i / 4;
    chartCtx.beginPath();
    chartCtx.moveTo(padL, y);
    chartCtx.lineTo(padL + plotW, y);
    chartCtx.stroke();
  }

  // Y-axis labels: general score
  chartCtx.fillStyle = '#00ffff';
  chartCtx.font = '10px Courier New';
  chartCtx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = padT + plotH * i / 4;
    const val = Math.round(scoreMax - (scoreMax - scoreMin) * i / 4);
    chartCtx.fillText(val, padL - 4, y + 3);
  }

  // X-axis labels: sequence numbers
  chartCtx.fillStyle = '#555';
  chartCtx.textAlign = 'center';
  const step = validRecords.length <= 10 ? 1 : Math.ceil(validRecords.length / 10);
  for (let i = 0; i < validRecords.length; i += step) {
    const x = padL + (validRecords.length === 1 ? plotW / 2 : plotW * i / (validRecords.length - 1));
    chartCtx.fillText('#' + (i + 1), x, ch - 4);
  }

  // Calculate point positions
  const pts = validRecords.map((r, i) => {
    const x = padL + (validRecords.length === 1 ? plotW / 2 : plotW * i / (validRecords.length - 1));
    const y = padT + plotH * (1 - (r.generalScore - scoreMin) / (scoreMax - scoreMin));
    return { x, y, record: r, isLast: i === validRecords.length - 1 };
  });
  chartPoints = pts;

  // Draw score line
  chartCtx.strokeStyle = '#00ffff';
  chartCtx.lineWidth = 1.5;
  if (pts.length >= 2) {
    chartCtx.beginPath();
    chartCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) chartCtx.lineTo(pts[i].x, pts[i].y);
    chartCtx.stroke();
  }

  // Draw points
  for (const p of pts) {
    chartCtx.fillStyle = '#00ffff';
    chartCtx.beginPath();
    chartCtx.arc(p.x, p.y, p.isLast ? 5 : 3, 0, Math.PI * 2);
    chartCtx.fill();
    if (p.isLast) {
      chartCtx.strokeStyle = '#fff';
      chartCtx.lineWidth = 1.5;
      chartCtx.stroke();
    }
  }
}

// ====== Accuracy Chart ======
function drawAccChart(records) {
  const dpr = window.devicePixelRatio || 1;
  const cw = 360, ch = 180;
  chartCanvasAcc.width = cw * dpr;
  chartCanvasAcc.height = ch * dpr;
  chartCanvasAcc.style.width = cw + 'px';
  chartCanvasAcc.style.height = ch + 'px';
  chartCtxAcc.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padL = 42, padR = 20, padT = 15, padB = 25;
  const plotW = cw - padL - padR;
  const plotH = ch - padT - padB;

  chartCtxAcc.clearRect(0, 0, cw, ch);
  chartAccPoints = [];

  // Filter out legacy records without accuracy, show last 20 only
  const allValid = records.filter(r => typeof r.accuracy === 'number');
  const validRecords = allValid.slice(-20);

  if (validRecords.length === 0) {
    chartCanvasAcc.style.display = 'none';
    return;
  }
  chartCanvasAcc.style.display = 'block';

  // Y-axis: adaptive range
  let accMin = Infinity, accMax = -Infinity;
  for (const r of validRecords) {
    if (r.accuracy < accMin) accMin = r.accuracy;
    if (r.accuracy > accMax) accMax = r.accuracy;
  }
  if (accMin === accMax) {
    accMin = Math.max(0, accMin - 10);
    accMax = Math.min(100, accMax + 10);
  }
  const accPad = (accMax - accMin) * 0.1;
  accMin = Math.max(0, accMin - accPad);
  accMax = Math.min(100, accMax + accPad);

  // Draw grid
  chartCtxAcc.strokeStyle = '#2a2a2a';
  chartCtxAcc.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + plotH * i / 4;
    chartCtxAcc.beginPath();
    chartCtxAcc.moveTo(padL, y);
    chartCtxAcc.lineTo(padL + plotW, y);
    chartCtxAcc.stroke();
  }

  // Y-axis labels: accuracy percentage
  chartCtxAcc.fillStyle = '#ff8800';
  chartCtxAcc.font = '10px Courier New';
  chartCtxAcc.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = padT + plotH * i / 4;
    const val = Math.round(accMax - (accMax - accMin) * i / 4);
    chartCtxAcc.fillText(val + '%', padL - 4, y + 3);
  }

  // X-axis labels: sequence numbers
  chartCtxAcc.fillStyle = '#555';
  chartCtxAcc.textAlign = 'center';
  const step = validRecords.length <= 10 ? 1 : Math.ceil(validRecords.length / 10);
  for (let i = 0; i < validRecords.length; i += step) {
    const x = padL + (validRecords.length === 1 ? plotW / 2 : plotW * i / (validRecords.length - 1));
    chartCtxAcc.fillText('#' + (i + 1), x, ch - 4);
  }

  // Calculate point positions
  const pts = validRecords.map((r, i) => {
    const x = padL + (validRecords.length === 1 ? plotW / 2 : plotW * i / (validRecords.length - 1));
    const y = padT + plotH * (1 - (r.accuracy - accMin) / (accMax - accMin));
    return { x, y, record: r, isLast: i === validRecords.length - 1 };
  });
  chartAccPoints = pts;

  // Draw accuracy line
  chartCtxAcc.strokeStyle = '#ff8800';
  chartCtxAcc.lineWidth = 1.5;
  if (pts.length >= 2) {
    chartCtxAcc.beginPath();
    chartCtxAcc.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) chartCtxAcc.lineTo(pts[i].x, pts[i].y);
    chartCtxAcc.stroke();
  }

  // Draw points
  for (const p of pts) {
    chartCtxAcc.fillStyle = '#ff8800';
    chartCtxAcc.beginPath();
    chartCtxAcc.arc(p.x, p.y, p.isLast ? 5 : 3, 0, Math.PI * 2);
    chartCtxAcc.fill();
    if (p.isLast) {
      chartCtxAcc.strokeStyle = '#fff';
      chartCtxAcc.lineWidth = 1.5;
      chartCtxAcc.stroke();
    }
  }
}

// ====== Tooltip handlers ======
function showChartTooltip(e, points, tooltip) {
  const rect = e.target.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let found = false;

  for (const p of points) {
    const dist = Math.hypot(mx - p.x, my - p.y);
    if (dist < 10) {
      const d = new Date(p.record.date);
      const dateStr = (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
        d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
      tooltip.innerHTML =
        `${dateStr}<br>` +
        `综合得分 ${p.record.generalScore}<br>` +
        `命中 ${p.record.hits} · 命中率 ${p.record.accuracy}% · 反应 ${p.record.avgReaction}ms`;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 50) + 'px';
      found = true;
      break;
    }
  }
  if (!found) tooltip.style.display = 'none';
}

const tooltip = document.getElementById('chartTooltip');

chartCanvas.addEventListener('mousemove', (e) => {
  showChartTooltip(e, chartPoints, tooltip);
});
chartCanvas.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});

chartCanvasAcc.addEventListener('mousemove', (e) => {
  tooltip.style.display = 'none';
});
chartCanvasAcc.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});
