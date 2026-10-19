import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import Stats from 'three/addons/libs/stats.module.js';
import GUI from 'lil-gui';
import { Simulation, type SimParams } from './sim/Simulation';
import { Bubbles, type LookParams } from './render/Bubbles';
import { blurredEquirect } from './render/envBlur';
import './style.css';

// ---------------------------------------------------------------- settings
const query = new URLSearchParams(location.search);

/** CC0 HDRIs from Poly Haven, each with a camera angle that frames it well. */
const ENVIRONMENTS = {
  'Park sunset': { file: 'rosendal_park_sunset_1k.hdr', cam: [-11, 0.3, 14], bg: 0.3, refl: 1 },
  'Cloudy dawn': { file: 'kloppenheim_06_1k.hdr', cam: [0, 0.3, 17], bg: 0.4, refl: 1 },
  'Night city': { file: 'shanghai_bund_1k.hdr', cam: [0, 0.5, 17], bg: 0.12, refl: 0.3 },
} as const;
type EnvName = keyof typeof ENVIRONMENTS;

const COUNTS: Record<string, number> = { '1,024': 32, '4,096': 64, '9,216': 96, '16,384': 128, '36,864': 192, '65,536': 256 };

const settings = {
  count: query.get('count') ?? '9,216',
  environment: (query.get('env') as EnvName) in ENVIRONMENTS ? (query.get('env') as EnvName) : 'Park sunset',
  backgroundBlur: 0.3,
  backgroundIntensity: 0.55,
  exposure: 1.3,
  bloomStrength: 0.55,
  bloomRadius: 0.55,
  bloomThreshold: 1.6,
  autoRotate: false,
  paused: false,
};

const sim: SimParams = {
  rise: 0.55, flow: 0.55, flowScale: 0.22, drag: 1.6, popRate: 0.02,
  minRadius: 0.02, maxRadius: 0.5,
  windRadius: 1.2, windForce: 9, popRadius: 0.5, burst: 3.5,
};

const look: LookParams = {
  size: 1, intensity: 1.4, envIntensity: 1.0,
  thickTop: 90, thickBottom: 480, swirl: 1.0, saturation: 1.25,
  focus: 11, aperture: 0.25,
};

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping; // keeps the film hues
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 30;
controls.autoRotateSpeed = 0.4;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0, 0, 0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const bounds = new THREE.Vector3(12, 6, 12);
const hdrLoader = new HDRLoader().setDataType(THREE.FloatType);
/** Per-HDRI exposure normalisation, so every environment has a similar mean brightness. */
let envNorm = 1;
let reflGain = 1;
const envCache = new Map<string, THREE.DataTexture>();
const reflCache = new Map<string, THREE.DataTexture>();

async function loadEnv(name: EnvName) {
  const e = ENVIRONMENTS[name];
  let tex = envCache.get(e.file);
  if (!tex) {
    tex = await hdrLoader.loadAsync(`${import.meta.env.BASE_URL}hdri/${e.file}`);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    envCache.set(e.file, tex);
    reflCache.set(e.file, blurredEquirect(tex));
  }
  reflTexture = reflCache.get(e.file)!;
  const d = tex.image.data as Float32Array;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  envNorm = 0.5 / (sum / (d.length / 4));
  reflGain = e.refl;
  return tex;
}

// ---------------------------------------------------------------- state
let simulation: Simulation;
let bubbles: Bubbles;
let envTexture: THREE.DataTexture;
let reflTexture: THREE.DataTexture;

function build() {
  simulation?.dispose();
  if (bubbles) { scene.remove(bubbles); bubbles.dispose(); }
  const size = COUNTS[settings.count] ?? 128;
  simulation = new Simulation(renderer, size, bounds, sim);
  bubbles = new Bubbles(size, bounds, reflTexture);
  scene.add(bubbles);
  hudCount.textContent = (size * size).toLocaleString('en-US');
}

async function applyEnvironment(resetCamera: boolean) {
  envTexture = await loadEnv(settings.environment);
  scene.background = envTexture;
  bubbles?.setEnv(reflTexture);
  if (resetCamera) {
    const e = ENVIRONMENTS[settings.environment];
    camera.position.set(e.cam[0], e.cam[1], e.cam[2]);
    const cam = query.get('cam')?.split(',').map(Number); // ?cam=x,y,z for reproducible shots
    if (cam?.length === 3 && cam.every(Number.isFinite)) camera.position.set(cam[0], cam[1], cam[2]);
    controls.target.set(0, 0, 0);
    settings.backgroundIntensity = e.bg;
    look.focus = camera.position.length();
    gui?.controllersRecursive().forEach((c) => c.updateDisplay());
  }
}

// ---------------------------------------------------------------- HUD
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <h1>bubbles.js</h1>
  <p><span id="count"></span> soap bubbles &middot; GPU instancing + GPGPU simulation &middot; thin-film interference</p>
  <p class="hint">move: blow &middot; click: pop &middot; drag: orbit &middot; H: hide UI</p>`;
document.body.appendChild(hud);
const hudCount = hud.querySelector('#count') as HTMLSpanElement;

const stats = new Stats();
stats.dom.id = 'stats';
document.body.appendChild(stats.dom);

let gui: GUI;
function createGUI() {
  gui = new GUI({ title: 'bubbles.js' });
  const fB = gui.addFolder('Bubbles');
  fB.add(settings, 'count', Object.keys(COUNTS)).name('count').onChange(build);
  fB.add(look, 'size', 0.3, 2.5, 0.01);
  fB.add(sim, 'minRadius', 0.01, 0.3, 0.005).name('min radius (new)');
  fB.add(sim, 'maxRadius', 0.05, 1.0, 0.005).name('max radius (new)');
  fB.add(sim, 'popRate', 0, 0.5, 0.005).name('spontaneous pops');
  fB.add({ popAll: () => { const r = sim.popRate; sim.popRate = 1e4; requestAnimationFrame(() => requestAnimationFrame(() => { sim.popRate = r; })); } }, 'popAll').name('pop everything');

  const fA = gui.addFolder('Air flow');
  fA.add(sim, 'rise', 0, 2, 0.01).name('buoyancy');
  fA.add(sim, 'flow', 0, 3, 0.01).name('curl noise');
  fA.add(sim, 'flowScale', 0.05, 1, 0.01).name('noise scale');
  fA.add(sim, 'drag', 0.1, 6, 0.01);
  fA.add(sim, 'windForce', 0, 30, 0.1).name('pointer wind');
  fA.add(sim, 'burst', 0, 15, 0.1).name('pop burst');

  const fF = gui.addFolder('Soap film');
  fF.add(look, 'thickTop', 0, 1500, 1).name('thickness top (nm)');
  fF.add(look, 'thickBottom', 0, 2000, 1).name('thickness bottom (nm)');
  fF.add(look, 'swirl', 0, 3, 0.01);
  fF.add(look, 'saturation', 0, 3, 0.01).name('colour boost');
  fF.add(look, 'intensity', 0, 6, 0.01).name('reflection gain');

  const fC = gui.addFolder('Camera');
  fC.add(look, 'focus', 2, 25, 0.01).name('focus distance');
  fC.add(look, 'aperture', 0, 3, 0.01).name('aperture (DOF)');
  fC.add(settings, 'autoRotate').name('auto rotate');
  fC.add(settings, 'paused');

  const fS = gui.addFolder('Scene');
  fS.add(settings, 'environment', Object.keys(ENVIRONMENTS)).onChange(() => applyEnvironment(true));
  fS.add(settings, 'backgroundBlur', 0, 1, 0.01).name('background blur');
  fS.add(settings, 'backgroundIntensity', 0, 2, 0.01).name('background level');
  fS.add(settings, 'exposure', 0.2, 3, 0.01);
  fS.add(settings, 'bloomStrength', 0, 2, 0.01).name('bloom');
  fS.add(settings, 'bloomThreshold', 0, 4, 0.01).name('bloom threshold');
  fS.add(settings, 'bloomRadius', 0, 1, 0.01).name('bloom radius');
  [fA, fF, fS].forEach((f) => f.close());
}

function setUIVisible(v: boolean) {
  for (const el of [gui.domElement, stats.dom, hud]) el.style.display = v ? '' : 'none';
}

// ---------------------------------------------------------------- input
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerInside = false;
let downAt: { x: number; y: number } | null = null;

const canvas = renderer.domElement;
canvas.addEventListener('pointermove', (e) => {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  pointerInside = true;
});
canvas.addEventListener('pointerleave', () => { pointerInside = false; });
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    simulation.click();
  }
  downAt = null;
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') setUIVisible(gui.domElement.style.display === 'none');
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
timer.connect(document);
let elapsed = 0;

function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 1 / 30);
  controls.autoRotate = settings.autoRotate;
  controls.update(dt);

  raycaster.setFromCamera(ndc, camera);
  if (!settings.paused) {
    elapsed += dt;
    simulation.step(dt, sim, raycaster.ray, pointerInside);
  }
  // Keep screen coverage roughly constant: more bubbles means smaller bubbles.
  const sizeScale = Math.pow(4096 / simulation.count, 0.5);
  bubbles.update(elapsed, simulation.positions, simulation.velocities, { ...look, size: look.size * sizeScale });

  scene.backgroundBlurriness = settings.backgroundBlur;
  scene.backgroundIntensity = settings.backgroundIntensity * envNorm;
  bubbles.material.uniforms.uEnvIntensity.value = look.envIntensity * envNorm * reflGain;
  renderer.toneMappingExposure = settings.exposure;
  bloom.strength = settings.bloomStrength;
  bloom.radius = settings.bloomRadius;
  bloom.threshold = settings.bloomThreshold;

  composer.render();
  stats.update();
}

async function start() {
  if (!renderer.capabilities.isWebGL2) {
    document.body.insertAdjacentHTML('beforeend', '<p id="error">WebGL 2 is required.</p>');
    return;
  }
  createGUI();
  await applyEnvironment(true);
  build();

  // Optional warm-up (?warm=N steps) so the flow field has organised the swarm.
  const warm = Number(query.get('warm') ?? 0);
  for (let i = 0; i < warm; i++) simulation.step(1 / 60, sim, raycaster.ray, false);
  elapsed = warm / 60;

  if (query.get('ui') === '0') setUIVisible(false);
  renderer.setAnimationLoop(frame);
}

start().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<p id="error">${String(err)}</p>`);
});
