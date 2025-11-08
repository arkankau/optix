import { Matrix4, PerspectiveCamera } from 'three';
import { NEARIFY_CFG } from './config';

/**
 * Build off-axis projection for a given eye so zero disparity lands at z0.
 * 
 * We keep cameras parallel and shear the frusta (no toe-in).
 * This is the correct way to do stereo for VR/AR - parallel camera axes
 * with asymmetric frustums that converge at the zero-disparity plane.
 * 
 * For -2D myopia, zero-disparity is at 0.50m (far point).
 * 
 * @param cam Camera to configure
 * @param eye 'L' or 'R' for left/right eye
 */
export function setOffAxisProjection(cam: PerspectiveCamera, eye: 'L' | 'R'): void {
  const { ipd, zCenter, near, far } = NEARIFY_CFG;

  // Camera params
  const fov = cam.fov * Math.PI / 180;
  const aspect = cam.aspect;
  const n = near;
  const f = far;

  // Calculate frustum bounds at near plane
  const t = n * Math.tan(fov / 2);
  const b = -t;
  const w = t * aspect;

  // Shift amount at near plane so principal rays intersect at zCenter
  // For left eye: shift left (negative), for right eye: shift right (positive)
  const shift = (eye === 'L' ? -ipd / 2 : ipd / 2) * (n / zCenter);

  const l = -w + shift;
  const r = w + shift;

  // Build custom projection matrix (off-axis frustum)
  const m = new Matrix4();
  
  // Standard off-axis frustum projection matrix
  const x = (2 * n) / (r - l);
  const y = (2 * n) / (t - b);
  const A = (r + l) / (r - l);
  const B = (t + b) / (t - b);
  const C = -(f + n) / (f - n);
  const D = -(2 * f * n) / (f - n);

  m.set(
    x, 0, A, 0,
    0, y, B, 0,
    0, 0, C, D,
    0, 0, -1, 0
  );
  
  cam.projectionMatrix.copy(m);
  cam.projectionMatrixInverse.copy(m).invert();
}

/**
 * Update stereo projections for both cameras
 * Stereo cameras share pose; we only change projection matrices per eye
 */
export function updateStereoProjections(camL: PerspectiveCamera, camR: PerspectiveCamera): void {
  setOffAxisProjection(camL, 'L');
  setOffAxisProjection(camR, 'R');
}

/**
 * Set up standard (mono) projection for comparison
 */
export function setStandardProjection(cam: PerspectiveCamera): void {
  cam.updateProjectionMatrix(); // Use Three.js default symmetric frustum
}

