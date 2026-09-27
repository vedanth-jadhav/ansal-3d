import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_NAMES, daypartFor, clockFor, ambientLabelFor,
  rewriteQuestHud, hideMissionChrome,
} from '../src/ambient/AmbientChrome.js';

function stubDoc({ count = '1/6 CHECKPOINTS', distance = '112 m from next point', dots = '● ○ ○ ○ ○ ○' } = {}) {
  const els = {
    questCount: { textContent: count },
    questDistance: { textContent: distance },
    dots: { textContent: dots, style: { display: '' } },
    pips: { textContent: '', style: { display: '' } },
  };
  return {
    querySelector: (sel) => {
      if (sel === '#questCount') return els.questCount;
      if (sel === '#questDistance') return els.questDistance;
      if (sel === '#questHud') return {
        querySelectorAll: (inner) => inner === '.au-quest-pips' ? [els.pips] : [els.dots],
      };
      return null;
    },
    querySelectorAll: () => [],
    __els: els,
  };
}

test('daypart + clock cover a full day without gaps', () => {
  assert.equal(daypartFor(0), 'Night');
  assert.equal(daypartFor(6), 'First light');
  assert.equal(daypartFor(18), 'Golden hour');
  assert.equal(daypartFor(23), 'Night');
  assert.equal(clockFor(18.5), '18:30');
});

test('ambient label has no counters or objectives', () => {
  const label = ambientLabelFor({ areaKey: 'sector12', hour: 18.5 });
  assert.equal(label.count, 'SECTOR 12');
  assert.match(label.distance, /Golden hour/);
  assert.ok(!/\d+\/\d+|next point|mission|checkpoint/i.test(label.count + label.distance));
  assert.equal(ambientLabelFor({ areaKey: 'nope', hour: 12 }).count, 'SUSHANT CITY');
});

test('rewriteQuestHud replaces counter text and hides dots + CSS pips', () => {
  const doc = stubDoc();
  const changed = rewriteQuestHud(doc, { count: 'SECTOR 12', distance: 'Golden hour · 18:30' });
  assert.equal(changed, true);
  assert.equal(doc.__els.questCount.textContent, 'SECTOR 12');
  assert.equal(doc.__els.questDistance.textContent, 'Golden hour · 18:30');
  assert.equal(doc.__els.dots.style.display, 'none');
  assert.equal(doc.__els.pips.style.display, 'none');
  assert.equal(rewriteQuestHud(doc, { count: 'SECTOR 12', distance: 'Golden hour · 18:30' }), false);
});

test('hideMissionChrome hides the MISSIONS pill only', () => {
  const pill = { textContent: 'MISSIONS', style: { display: '' } };
  const play = { textContent: 'ENTER THE CITY', style: { display: '' } };
  const doc = { querySelectorAll: () => [pill, play] };
  assert.equal(hideMissionChrome(doc), 1);
  assert.equal(pill.style.display, 'none');
  assert.equal(play.style.display, '');
});

test('area names cover every travel stop', () => {
  for (const key of ['regencia', 'temple', 'watertank', 'sector12', 'sector18', 'dblock']) {
    assert.ok(AREA_NAMES[key], key);
  }
});
