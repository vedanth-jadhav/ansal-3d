// AmbientChrome: de-missions the RC2 HUD without touching the frozen bundle.
// The bundle owns #questHud and rewrites it as you move; this module observes
// and rewrites mission-flavored text into ambient place/time labels.
// All DOM access is injected (document + callbacks) so this stays unit-testable.
export const AREA_NAMES = {
  regencia: 'La Regencia',
  temple: 'Temple loop',
  watertank: 'Market road',
  sector12: 'Sector 12',
  sector18: 'F-Block corridor',
  dblock: 'D Block',
};

export function daypartFor(hour) {
  if (hour < 5) return 'Night';
  if (hour < 7) return 'First light';
  if (hour < 11) return 'Morning';
  if (hour < 15) return 'Midday haze';
  if (hour < 17.5) return 'Afternoon';
  if (hour < 19) return 'Golden hour';
  if (hour < 20.5) return 'Dusk';
  return 'Night';
}

export function clockFor(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Pure: compute the ambient label. No counters, no "next point", no objectives.
export function ambientLabelFor({ areaKey, hour }) {
  const area = AREA_NAMES[areaKey] || 'Sushant City';
  return {
    count: area.toUpperCase(),
    distance: `${daypartFor(hour)} · ${clockFor(hour)}`,
  };
}

const DOTS = /^[●○\s·]+$/;

// Rewrite one pass over the HUD. Returns true if anything changed.
export function rewriteQuestHud(doc, label) {
  let changed = false;
  const count = doc.querySelector?.('#questCount');
  if (count && count.textContent !== label.count) { count.textContent = label.count; changed = true; }
  const dist = doc.querySelector?.('#questDistance');
  if (dist && dist.textContent !== label.distance) { dist.textContent = label.distance; changed = true; }
  // Hide checkpoint pips: RC2 renders them as CSS dots (div.au-quest-pips > i),
  // older builds as text (●○○○○○). Cover both.
  const hud = doc.querySelector?.('#questHud');
  const pips = hud?.querySelectorAll ? [...hud.querySelectorAll('.au-quest-pips')] : [];
  for (const el of pips) {
    if (el.style.display !== 'none') { el.style.display = 'none'; changed = true; }
  }
  const candidates = hud?.querySelectorAll ? [...hud.querySelectorAll('div,span,b,i')] : [];
  for (const el of candidates) {
    if (el !== count && el !== dist && DOTS.test(el.textContent || '') && (el.textContent || '').trim()) {
      if (el.style.display !== 'none') { el.style.display = 'none'; changed = true; }
    }
  }
  return changed;
}

// Hide the MISSIONS pill / anything mission-labeled. Returns count hidden.
export function hideMissionChrome(doc) {
  let hidden = 0;
  const buttons = doc.querySelectorAll ? [...doc.querySelectorAll('button')] : [];
  for (const b of buttons) {
    const t = (b.textContent || '').trim().toUpperCase();
    if ((t === 'MISSIONS' || t === 'MISSION') && b.style.display !== 'none') {
      b.style.display = 'none'; hidden++;
    }
  }
  return hidden;
}

// Keep the HUD ambient: re-apply after the bundle rewrites it.
// getLabel() -> {count, distance}. Tick is DOM-text only (no render scheduling).
export function startChromeSync({ doc, getLabel, intervalMs = 1000 }) {
  const apply = () => {
    try {
      hideMissionChrome(doc);
      rewriteQuestHud(doc, getLabel());
    } catch { /* HUD not ready yet; try next tick */ }
  };
  apply();
  const hud = doc.querySelector?.('#questHud');
  let observer = null;
  if (hud && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(apply);
    observer.observe(hud, { childList: true, characterData: true, subtree: true });
  }
  const timer = setInterval(apply, intervalMs);
  // Re-label immediately when the traveler quick-travels.
  const travel = doc.querySelector?.('#travelSelect');
  if (travel?.addEventListener) travel.addEventListener('change', () => setTimeout(apply, 50));
  return () => { clearInterval(timer); observer?.disconnect(); };
}
