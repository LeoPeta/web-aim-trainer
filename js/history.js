// ====== Training History (localStorage) ======
const HISTORY_KEY = 'aimTrainerHistory';
const HISTORY_MAX = 50;

function getModeId() {
  const distCode = {8:'N', 12:'M', 16:'F'}[currentDist];
  const sizeCode = {0.45:'B', 0.35:'M', 0.25:'S', 0.15:'T'}[currentRadius];
  const gridCode = currentGrid === '3x3' ? '9' : '25';
  return `${distCode}-${sizeCode}-${totalTime}-${gridCode}`;
}

function getModeLabel(modeId) {
  const parts = modeId.split('-');
  const distLabel = {N:'近', M:'中', F:'远'}[parts[0]];
  const sizeLabel = {B:'大', M:'中', S:'小', T:'极小'}[parts[1]];
  const durLabel = parts[2] >= 60 ? (parts[2] / 60) + '分钟' : parts[2] + '秒';
  const gridLabel = parts[3] === '9' ? '9宫格' : '25宫格';
  return `${distLabel}+${sizeLabel}+${durLabel}+${gridLabel}`;
}

// ====== General Score Calculation ======
// Formula: hits × 100 × accuracy^2 × reactionFactor
// reactionFactor: asymmetric Gaussian, peak at 220ms,
//   strict left (anti-spam), lenient right (slow players)
function calcGeneralScore(hits, misses, avgReaction) {
  const total = hits + misses;
  if (total === 0 || hits === 0) return 0;

  const accuracy = hits / total;
  const accFactor = accuracy * accuracy;  // ^2

  // Asymmetric Gaussian centered at 220ms
  const dt = avgReaction - 220;
  const reactFactor = dt < 0
    ? Math.exp(-(dt * dt) / 5000)    // strict left side (anti-spam)
    : Math.exp(-(dt * dt) / 28800);  // lenient right side (slow players)

  return Math.round(hits * 100 * accFactor * reactFactor);
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) { return []; }
}

function saveHistory(records) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

function saveRecord(modeId, generalScore, score, hits, misses, accuracy, avgReaction) {
  const records = loadHistory();
  records.push({
    modeId: modeId,
    date: Date.now(),
    generalScore: generalScore,
    score: score,
    hits: hits,
    misses: misses,
    accuracy: accuracy,
    avgReaction: avgReaction
  });
  // FIFO: keep only last HISTORY_MAX
  if (records.length > HISTORY_MAX) records.splice(0, records.length - HISTORY_MAX);
  saveHistory(records);
}

function getRecordsByMode(modeId) {
  return loadHistory().filter(r => r.modeId === modeId).sort((a, b) => a.date - b.date);
}
