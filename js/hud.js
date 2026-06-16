// ====== HUD ======
function updateHUD() {
  document.getElementById('scoreText').textContent = score;
  document.getElementById('hitsText').textContent = hits;
  document.getElementById('missesText').textContent = misses;
}
