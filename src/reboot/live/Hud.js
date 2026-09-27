// DOM HUD. All document access happens inside functions so this module is
// import-safe in node (tests only touch formatSpeed). Every owned id is
// prefixed rb-: #rb-hud, #rb-mission, #rb-place, #rb-speed, #rb-hint,
// #rb-mute, #rb-toast.

// Pure + test-covered: ms is metres/second, driving is boolean.
export function formatSpeed(ms, driving) {
  let v = Number(ms);
  if (!Number.isFinite(v) || v < 0) v = 0;
  return `${Math.round(v * 3.6)} km/h ${driving ? 'DRIVE' : 'WALK'}`;
}

function noop() {}

function style(el, rules) {
  try {
    for (const k of Object.keys(rules)) el.style[k] = rules[k];
  } catch { /* ignore */ }
}

export function initHud() {
  const stub = {
    setMission: noop, setPlace: noop, setSpeed: noop,
    onMuteToggle: noop, toast: noop, root: null, el: {},
  };
  try {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return stub;
    }
    // Reuse the shell's #rb-hud when present (reboot.html) so we never
    // create duplicate IDs; only create when embedding standalone.
    const root = document.getElementById('rb-hud') || document.createElement('div');
    const created = !root.parentNode;
    root.id = 'rb-hud';
    style(root, {
      position: 'fixed', top: '12px', left: '12px', zIndex: '50',
      fontFamily: 'monospace, monospace', fontSize: '13px', color: '#fff',
      pointerEvents: 'none', userSelect: 'none',
    });

    const mission = document.createElement('div');
    mission.id = 'rb-mission';
    style(mission, {
      background: 'rgba(0,0,0,0.55)', padding: '6px 10px',
      borderRadius: '6px', marginBottom: '6px', maxWidth: '320px',
    });
    mission.textContent = 'No mission — find work';

    const place = document.createElement('div');
    place.id = 'rb-place';
    style(place, {
      background: 'rgba(0,0,0,0.55)', padding: '6px 10px',
      borderRadius: '6px', marginBottom: '6px', maxWidth: '320px',
    });
    place.textContent = '';

    const speed = document.createElement('div');
    speed.id = 'rb-speed';
    style(speed, {
      background: 'rgba(0,0,0,0.55)', padding: '6px 10px',
      borderRadius: '6px', marginBottom: '6px', maxWidth: '320px',
    });
    speed.textContent = '0 km/h WALK';

    const hint = document.createElement('div');
    hint.id = 'rb-hint';
    style(hint, {
      background: 'rgba(0,0,0,0.35)', padding: '4px 10px',
      borderRadius: '6px', marginBottom: '6px', maxWidth: '320px',
      fontSize: '11px', opacity: '0.85',
    });
    hint.textContent = 'Touch: left stick move · TAP drive button to enter vehicle';

    const mute = document.createElement('button');
    mute.id = 'rb-mute';
    mute.type = 'button';
    style(mute, {
      background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid #888',
      padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
      pointerEvents: 'auto', fontFamily: 'inherit', fontSize: 'inherit',
    });
    mute.textContent = 'SOUND: ON';

    const toastBox = document.createElement('div');
    toastBox.id = 'rb-toast';
    style(toastBox, { marginTop: '6px', maxWidth: '320px' });

    root.appendChild(mission);
    root.appendChild(place);
    root.appendChild(speed);
    root.appendChild(hint);
    root.appendChild(mute);
    root.appendChild(toastBox);
    try {
      if (created) document.body.appendChild(root);
    } catch { /* headless: keep detached */ }

    let muted = false;
    return {
      root,
      el: { mission, place, speed, hint, mute, toast: toastBox },
      setMission(text) {
        try {
          mission.textContent = String(text ?? '');
        } catch { /* never throw to page */ }
      },
      setPlace(text) {
        try {
          place.textContent = String(text ?? '');
        } catch { /* never throw to page */ }
      },
      // kmh is already kilometres/hour (Live converts from m/s).
      setSpeed(kmh, driving) {
        try {
          let v = Number(kmh);
          if (!Number.isFinite(v) || v < 0) v = 0;
          speed.textContent = `${Math.round(v)} km/h ${driving ? 'DRIVE' : 'WALK'}`;
        } catch { /* never throw to page */ }
      },
      onMuteToggle(cb) {
        try {
          mute.addEventListener('click', (e) => {
            try {
              e.stopPropagation?.();
            } catch { /* ignore */ }
            let next = muted;
            try {
              const r = cb?.();
              next = typeof r === 'boolean' ? r : !muted;
            } catch {
              next = !muted;
            }
            muted = next;
            try {
              mute.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
            } catch { /* ignore */ }
          });
        } catch { /* never throw to page */ }
      },
      toast(text) {
        try {
          const line = document.createElement('div');
          style(line, {
            background: 'rgba(20,20,20,0.8)', padding: '6px 10px',
            borderRadius: '6px', marginTop: '4px',
            transition: 'opacity 0.6s', opacity: '1',
          });
          line.textContent = String(text ?? '');
          toastBox.appendChild(line);
          const fade = () => {
            try {
              line.style.opacity = '0';
            } catch { /* ignore */ }
            setTimeout(() => {
              try {
                line.remove();
              } catch { /* ignore */ }
            }, 650);
          };
          setTimeout(fade, 2200);
        } catch { /* never throw to page */ }
      },
    };
  } catch {
    return stub;
  }
}
