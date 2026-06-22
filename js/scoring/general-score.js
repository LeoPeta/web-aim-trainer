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
