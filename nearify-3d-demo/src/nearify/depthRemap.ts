import { Vector3 } from 'three';
import { NEARIFY_CFG } from './config';

/**
 * Remap a point P (in eye space) to compressed depth around zCenter.
 * 
 * Uses tanh compression to pull far objects toward the clarity band
 * while preserving objects already near zCenter.
 * 
 * @param pEye Point in eye space (camera at origin)
 * @returns Remapped point compressed toward clarity band
 */
export function remapPoint(pEye: Vector3): Vector3 {
  const { zCenter, bandHalfWidth: W, transScale: S, alpha: A } = NEARIFY_CFG;
  
  const z = pEye.length(); // metric depth from eye
  
  // Tanh compression: [-1, 1]
  const t = Math.tanh(A * (z - zCenter) / S);
  
  // Remap depth
  const zRemap = zCenter + t * W;
  
  // Push along the ray direction to new depth
  const dir = pEye.clone().normalize();
  return dir.multiplyScalar(zRemap);
}

/**
 * GPU-friendly depth factor given original metric depth z
 * Returns the remapped depth value
 */
export function remapDepthScalar(z: number): number {
  const { zCenter, bandHalfWidth: W, transScale: S, alpha: A } = NEARIFY_CFG;
  const t = Math.tanh(A * (z - zCenter) / S);
  return zCenter + t * W;
}

/**
 * Inverse remap: given a remapped depth, estimate original depth
 * Useful for debugging and visualization
 */
export function inverseRemapDepth(zRemap: number): number {
  const { zCenter, bandHalfWidth: W, transScale: S, alpha: A } = NEARIFY_CFG;
  
  // t = (zRemap - zCenter) / W
  const t = (zRemap - zCenter) / W;
  
  // z = zCenter + (S/A) * atanh(t)
  const atanh_t = 0.5 * Math.log((1 + t) / (1 - t));
  return zCenter + (S / A) * atanh_t;
}

