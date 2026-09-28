// CityBuilder.js — wires OsmGraph + RoadMesh + Housing + Landmarks.
// initCity({ scene, osm, catalog }) -> { graph, colliders, spawn, update }
import * as THREE from 'three';
import { buildOsmGraph } from './OsmGraph.js';
import { buildRoads } from './RoadMesh.js';
import { buildHousing } from './Housing.js';
import { buildLandmarks } from './Landmarks.js';

const SPAWN_FOCUS = { x: -150, z: -250 };

function pickSpawn(graph) {
  let best = null;
  for (const s of graph.segments) {
    if (!s.drive) continue;
    const mx = (s.ax + s.bx) / 2;
    const mz = (s.az + s.bz) / 2;
    const dist = Math.hypot(mx - SPAWN_FOCUS.x, mz - SPAWN_FOCUS.z);
    // Prefer wide roads near the focus: clearance for player + camera.
    const score = dist - (s.width || 0) * 10;
    if (!best || score < best.score) {
      const dx = s.bx - s.ax; const dz = s.bz - s.az;
      best = { x: mx, z: mz, heading: Math.atan2(dx, dz), score };
    }
  }
  if (!best) return { x: SPAWN_FOCUS.x, z: SPAWN_FOCUS.z, heading: 0 };
  return { x: best.x, z: best.z, heading: best.heading };
}

function makeSky() {
  const uniforms = {
    uTop: { value: new THREE.Color(0x3d6fb4) },
    uMid: { value: new THREE.Color(0x9fc0e0) },
    uHorizon: { value: new THREE.Color(0xe8d9b8) },
    uSun: { value: new THREE.Color(0xfff2d8) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon;
      uniform vec3 uSun; uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -1.0, 1.0);
        vec3 col = h > 0.0
          ? mix(mix(uHorizon, uMid, smoothstep(0.0, 0.35, h)), uTop, smoothstep(0.3, 0.9, h))
          : mix(uHorizon, uHorizon * 0.55, smoothstep(0.0, -0.4, h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSun * (pow(s, 800.0) * 1.2 + pow(s, 10.0) * 0.22);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), mat);
  dome.name = 'reboot:sky';
  dome.frustumCulled = false;
  return { dome, uniforms };
}

// Sun path: elevation = sin((hour-6)/12 * PI) (up at 6h, peak 12h, down 18h),
// azimuth sweeps an east->west arc over the same interval.
export function sunDirForHour(hour) {
  const t = (hour - 6) / 12;
  const el = Math.sin(t * Math.PI);
  const az = t * Math.PI;
  const v = new THREE.Vector3(Math.cos(az), Math.max(el, -0.25), 0.35);
  return v.normalize();
}

export function initCity({ scene, osm, catalog } = {}) {
  if (!scene) throw new Error('initCity: scene is required');
  const graph = buildOsmGraph(osm ?? { roads: [] });
  const colliders = [];

  buildRoads(scene, graph);
  const housing = buildHousing(scene, graph, catalog ?? []);
  colliders.push(...housing.colliders);
  const landmarks = buildLandmarks(scene, catalog ?? []);
  colliders.push(...landmarks.colliders);

  const { dome, uniforms } = makeSky();
  scene.add(dome);

  const hemi = new THREE.HemisphereLight(0xbfd6e4, 0x8a7a5a, 0.7);
  hemi.name = 'reboot:hemi';
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.name = 'reboot:sun';
  scene.add(sun);
  scene.add(sun.target);
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  ambient.name = 'reboot:ambient';
  scene.add(ambient);
  scene.fog = new THREE.FogExp2(0xcfd8e3, 0.0015);

  const warm = new THREE.Color(0xffd9a0);
  const noon = new THREE.Color(0xffffff);

  function update(dt, clock) {
    const hour = Number.isFinite(clock?.hour) ? clock.hour : 10;
    const dir = sunDirForHour(hour);
    const day = Math.max(0, Math.min(1, (dir.y + 0.05) / 1.05));
    uniforms.uSunDir.value.copy(dir);
    sun.position.copy(dir).multiplyScalar(400);
    sun.intensity = 0.05 + day * 1.25;
    sun.color.copy(warm).lerp(noon, day);
    hemi.intensity = 0.12 + day * 0.6;
    ambient.intensity = 0.05 + day * 0.12;
    uniforms.uHorizon.value.setHex(0xe8d9b8).lerp(new THREE.Color(0x2a3348), 1 - day);
    void dt;
  }
  update(0, { hour: 10 });

  const spawn = pickSpawn(graph);
  return { graph, colliders, spawn, update };
}
