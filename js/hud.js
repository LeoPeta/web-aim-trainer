// ====== HUD ======
// Modes declare `hudItems: [{ label, value: () => any }]`. The row structure is
// built once per mode (renderHUD) and only the values are refreshed each frame
// (updateHUD). Modes without hudItems fall back to the classic 得分/命中/未中 row.

const DEFAULT_HUD_ITEMS = [
  { label: '得分', value: () => score },
  { label: '命中', value: () => hits },
  { label: '未中', value: () => misses },
];

function getHudItems() {
  const mode = getActiveModeConfig();
  return (mode && mode.hudItems) || DEFAULT_HUD_ITEMS;
}

function renderHUD() {
  const row = document.getElementById('hudRow');
  if (!row) return;
  row.innerHTML = getHudItems().map((item, i) =>
    `<div>${item.label} <span class="hud-val" id="hudVal${i}">0</span></div>`
  ).join('');
}

function updateHUD() {
  const items = getHudItems();
  for (let i = 0; i < items.length; i++) {
    const el = document.getElementById('hudVal' + i);
    if (el) el.textContent = items[i].value();
  }
}
