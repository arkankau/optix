import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NEARIFY_CFG, farPointFromRx, getClarityBand } from './nearify/config';
import { updateStereoProjections, setStandardProjection } from './nearify/stereo';
import { makeTextUIPlane } from './nearify/uiPlane';
import { hudText, createHUDData, formatDistance } from './nearify/hud';
import { makeTestObjects, applyCpuDepthRemap, resetObjectPositions, makeGroundGrid } from './scene/testScene';

// Get DOM elements
const canvasL = document.getElementById('left') as HTMLCanvasElement;
const canvasR = document.getElementById('right') as HTMLCanvasElement;
const hudEl = document.getElementById('hud') as HTMLDivElement;
const toggleStereoBtn = document.getElementById('toggleStereo') as HTMLButtonElement;
const toggleRemapBtn = document.getElementById('toggleRemap') as HTMLButtonElement;
const toggleUIBtn = document.getElementById('toggleUI') as HTMLButtonElement;

// State
let stereoEnabled = true;
let remapEnabled = true;
let uiVisible = true;

// Create renderers
const rendererL = new THREE.WebGLRenderer({ canvas: canvasL, antialias: true });
const rendererR = new THREE.WebGLRenderer({ canvas: canvasR, antialias: true });
rendererL.setPixelRatio(window.devicePixelRatio);
rendererR.setPixelRatio(window.devicePixelRatio);

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);
scene.fog = new THREE.Fog(0x101014, 2, 10);

// Create cameras
const camL = new THREE.PerspectiveCamera(60, 1, NEARIFY_CFG.near, NEARIFY_CFG.far);
const camR = new THREE.PerspectiveCamera(60, 1, NEARIFY_CFG.near, NEARIFY_CFG.far);

// Both eyes share pose; offset is in projection (off-axis)
camL.position.set(0, 0, 0);
camR.position.set(0, 0, 0);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(2, 3, 1);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Content - test objects at various depths
const objects = makeTestObjects();
scene.add(objects);

// Ground grid
const ground = makeGroundGrid();
scene.add(ground);

// UI plane pinned at zCenter (far point)
const ui = makeTextUIPlane('NEARIFY 3D\n-2D Myopia', 28, 16);
scene.add(ui);

// Debug camera for controls
const debugCam = new THREE.PerspectiveCamera(60, 1, 0.1, 50);
debugCam.position.set(0, 0.3, 1.2);
const controls = new OrbitControls(debugCam, canvasL);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Layout function
function layout() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const w2 = Math.floor(W / 2);
  
  canvasL.width = w2;
  canvasL.height = H;
  canvasR.width = w2;
  canvasR.height = H;
  
  rendererL.setSize(w2, H, false);
  rendererR.setSize(w2, H, false);
  
  camL.aspect = w2 / H;
  camR.aspect = w2 / H;
  
  if (stereoEnabled) {
    updateStereoProjections(camL, camR);
  } else {
    setStandardProjection(camL);
    setStandardProjection(camR);
  }
}

window.addEventListener('resize', layout);
layout();

// Update HUD
function updateHUD(fps: number) {
  const farPoint = farPointFromRx(NEARIFY_CFG.rx);
  const band = getClarityBand();
  
  const data = createHUDData({
    rx: NEARIFY_CFG.rx.sphereD,
    farPoint,
    zeroDisparity: NEARIFY_CFG.zCenter,
    clarityBand: `±${formatDistance(NEARIFY_CFG.bandHalfWidth)} (${formatDistance(band.min)}-${formatDistance(band.max)})`,
    stereo: stereoEnabled ? 'Off-axis (no toe-in)' : 'Disabled (mono)',
    depthRemap: remapEnabled ? 'Active' : 'Disabled',
    fps,
  });
  
  hudText(hudEl, data);
}

// Controls
toggleStereoBtn.addEventListener('click', () => {
  stereoEnabled = !stereoEnabled;
  toggleStereoBtn.textContent = `Stereo: ${stereoEnabled ? 'ON' : 'OFF'}`;
  toggleStereoBtn.classList.toggle('active', stereoEnabled);
  layout();
});

toggleRemapBtn.addEventListener('click', () => {
  remapEnabled = !remapEnabled;
  toggleRemapBtn.textContent = `Depth Remap: ${remapEnabled ? 'ON' : 'OFF'}`;
  toggleRemapBtn.classList.toggle('active', remapEnabled);
  
  if (!remapEnabled) {
    resetObjectPositions(objects);
  }
});

toggleUIBtn.addEventListener('click', () => {
  uiVisible = !uiVisible;
  ui.visible = uiVisible;
  toggleUIBtn.textContent = `UI Plane: ${uiVisible ? 'ON' : 'OFF'}`;
  toggleUIBtn.classList.toggle('active', uiVisible);
});

// Animation loop
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 0;

function tick() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  // FPS calculation
  frameCount++;
  if (elapsed - lastFpsUpdate > 1.0) {
    fps = frameCount / (elapsed - lastFpsUpdate);
    frameCount = 0;
    lastFpsUpdate = elapsed;
    updateHUD(fps);
  }
  
  // Update controls
  controls.update();
  
  // Keep both cameras aligned to "head" pose (debugCam)
  camL.position.copy(debugCam.position);
  camR.position.copy(debugCam.position);
  camL.quaternion.copy(debugCam.quaternion);
  camR.quaternion.copy(debugCam.quaternion);
  
  // Update projections if stereo is enabled
  if (stereoEnabled) {
    updateStereoProjections(camL, camR);
  }
  
  // CPU depth remap of scene (for demo; GPU vertex modifier is preferred for production)
  if (remapEnabled) {
    applyCpuDepthRemap(objects, debugCam.position);
  } else {
    // Keep objects at original positions when remap is disabled
    // (resetObjectPositions is called once when toggling off)
  }
  
  // Render SBS
  rendererL.render(scene, camL);
  rendererR.render(scene, camR);
  
  requestAnimationFrame(tick);
}

// Initial HUD update
updateHUD(0);

// Start animation
tick();

console.log('🎯 3D Nearify Demo Started');
console.log('📊 Configuration:', NEARIFY_CFG);
console.log('👓 Far point (1/|Rx|):', farPointFromRx(NEARIFY_CFG.rx) * 100, 'cm');
console.log('🎮 Controls:');
console.log('  - Use mouse to orbit around the scene');
console.log('  - Toggle buttons to enable/disable features');
console.log('  - Look through a side-by-side (SBS) viewer for stereo effect');

