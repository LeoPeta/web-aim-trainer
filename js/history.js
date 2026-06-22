// ====== Training History (localStorage) ======
const HISTORY_KEY = 'aimTrainerHistory';
const HISTORY_MAX = 50;

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
