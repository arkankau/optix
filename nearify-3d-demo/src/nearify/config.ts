export type Rx = { sphereD: number }; // negative for myopia

export const NEARIFY_CFG = {
  rx: { sphereD: -2.0 } as Rx,
  ipd: 0.063,           // meters (63mm)
  zCenter: 0.50,        // far point (1/|Rx| for −2D)
  bandHalfWidth: 0.10,  // 0.40–0.60 m clarity band
  transScale: 1.5,      // transition scale (m)
  alpha: 0.8,           // remap steepness
  near: 0.2,            // near clip plane
  far: 20.0,            // far clip plane
};

/**
 * Calculate far point from Rx
 * Far point = 1 / |sphere_D|
 */
export function farPointFromRx(rx: Rx): number {
  return 1 / Math.abs(rx.sphereD);
}

/**
 * Get clarity band range
 */
export function getClarityBand(): { min: number; max: number } {
  const { zCenter, bandHalfWidth } = NEARIFY_CFG;
  return {
    min: zCenter - bandHalfWidth,
    max: zCenter + bandHalfWidth,
  };
}

