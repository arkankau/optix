/**
 * Nearify Vision: Distance-aware UI scaling for myopia
 * 
 * Core idea: Keep content inside the user's accommodation range by increasing
 * angular size (making it effectively "closer") rather than using blur/deblur.
 */

/**
 * Maximum accommodation capacity (diopters)
 * Typical young adult: 1.5D
 */
export const Amax_D = 1.5;

/**
 * Calculate far point of clear vision (meters)
 * Far point = 1 / (R + Amax)
 * 
 * @param sphere_D Sphere power (negative for myopia)
 * @param Amax Maximum accommodation (default 1.5D)
 * @returns Distance in meters where content becomes blurry
 */
export function farPointMeters(sphere_D: number, Amax: number = Amax_D): number {
  const R = Math.max(0, Math.abs(sphere_D));
  const have = R + Amax;
  return have > 0 ? 1 / have : Infinity;
}

/**
 * TWO-SIDED myopia classification
 * Correctly classifies whether user is too far, too near, or inside clear zone
 * 
 * Physics:
 * - R = |sphere_D| (myopia magnitude)
 * - need = 1/d (power needed to see at distance d)
 * - Clear zone: R ≤ need ≤ R + Amax
 * 
 * Example: -2D @ 60cm
 * - R = 2D, need = 1.67D
 * - need < R → too_far, ΔD = 2 - 1.67 = 0.33D
 * 
 * @param sphere_D Sphere power (negative for myopia)
 * @param distance_cm Current viewing distance in cm
 * @param Amax Maximum accommodation (default 1.5D)
 * @returns Classification result with region and excess defocus
 */
export function classifyMyopia(
  sphere_D: number,
  distance_cm: number,
  Amax: number = Amax_D
): { region: 'too_far' | 'too_near' | 'inside'; deltaD: number } {
  const R = Math.abs(sphere_D); // diopters
  const need = 1 / Math.max(0.2, distance_cm / 100); // diopters
  const lower = R; // far-point boundary
  const upper = R + Amax; // near accommodation boundary

  if (need < lower) {
    // Too far (beyond far point) - e.g., -2D @ 60cm → 0.33D
    return { region: 'too_far', deltaD: lower - need };
  }
  if (need > upper) {
    // Too near (need more accommodation than available)
    return { region: 'too_near', deltaD: need - upper };
  }
  // Inside clear zone
  return { region: 'inside', deltaD: 0 };
}

/**
 * Calculate excess defocus ΔD (diopters beyond accommodation)
 * DEPRECATED: Use classifyMyopia() instead for correct two-sided classification
 * 
 * This legacy function is kept for backward compatibility but uses
 * the correct two-sided logic internally.
 * 
 * @param sphere_D Sphere power (negative for myopia)
 * @param distance_cm Current viewing distance in cm
 * @param Amax Maximum accommodation (default 1.5D)
 * @returns Excess defocus in diopters
 */
export function deltaD(sphere_D: number, distance_cm: number, Amax: number = Amax_D): number {
  const result = classifyMyopia(sphere_D, distance_cm, Amax);
  return result.deltaD;
}

/**
 * Calculate pixels per degree (PPD)
 * PPD = PPI × (π/180) × (distance_inches)
 * 
 * @param ppi Display pixels per inch
 * @param distance_cm Viewing distance in cm
 * @returns Pixels per degree of visual angle
 */
export function ppd(ppi: number, distance_cm: number): number {
  const distance_inches = distance_cm / 2.54;
  return ppi * (Math.PI / 180) * distance_inches;
}

/**
 * Target x-height angular size (arcminutes) based on blur
 * More blur → need larger angular size for legibility
 * 
 * Mapping: 12 arcmin (ΔD ≈ 0.5D) → 20 arcmin (ΔD ≥ 1.5D)
 * 
 * @param deltaD_val Excess defocus in diopters
 * @returns Target angular size in arcminutes
 */
export function thetaTargetArcmin(deltaD_val: number): number {
  // Linear interpolation: 12 → 20 arcmin over ΔD range 0.5 → 1.5D
  const normalized = Math.min(1, Math.max(0, (deltaD_val - 0.5) / 1.0));
  const t = 12 + 8 * normalized;
  return Math.max(10, Math.min(22, t));
}

/**
 * Calculate minimum font size (pixels) for legibility
 * 
 * @param ppi Display PPI
 * @param distance_cm Viewing distance in cm
 * @param deltaD_val Excess defocus in diopters
 * @param xh x-height fraction of font size (default 0.5)
 * @returns Minimum font size in pixels
 */
export function minFontPx(
  ppi: number,
  distance_cm: number,
  deltaD_val: number,
  xh: number = 0.5
): number {
  const PPD = ppd(ppi, distance_cm);
  const theta = thetaTargetArcmin(deltaD_val);
  const xh_clamped = Math.max(0.35, Math.min(0.7, xh));
  
  // Convert arcmin to degrees, then to pixels
  const font_px = (theta / 60) * PPD / xh_clamped;
  return Math.ceil(font_px);
}

/**
 * Nearify parameters
 */
export interface NearifyParams {
  ppi: number;
  distance_cm: number;
  sphere_D: number;
  currentFontPx: number;
}

/**
 * Nearify guidance result
 */
export interface NearifyGuidance {
  scale: number;          // UI scale factor (1.0 = no scaling)
  deltaD: number;         // Excess defocus (D)
  fontPxMin: number;      // Recommended minimum font size (px)
  thetaArcmin: number;    // Target angular size (arcmin)
  farPointCm: number;     // Far point of clear vision (cm)
  needsScaling: boolean;  // True if ΔD > 0
  moveHint: string | null; // Hint to move closer, or null
}

/**
 * Check if inside clear zone (no scaling needed)
 */
export function isInClearZone(sphere_D: number, distance_cm: number, Amax: number = Amax_D): boolean {
  return deltaD(sphere_D, distance_cm, Amax) < 0.01;
}

/**
 * Compute Nearify guidance
 * Returns recommended UI scale and related metrics
 */
export function computeNearifyGuidance(params: NearifyParams): NearifyGuidance {
  const { ppi, distance_cm, sphere_D, currentFontPx } = params;
  
  const ΔD = deltaD(sphere_D, distance_cm);
  const farPoint_m = farPointMeters(sphere_D);
  const farPoint_cm = Math.round(farPoint_m * 100);
  
  // Inside clear zone - no scaling needed
  if (ΔD < 0.01) {
    return {
      scale: 1.0,
      deltaD: 0,
      fontPxMin: currentFontPx,
      thetaArcmin: 12,
      farPointCm: farPoint_cm,
      needsScaling: false,
      moveHint: null,
    };
  }
  
  // Outside clear zone - calculate required scaling
  const needPx = minFontPx(ppi, distance_cm, ΔD);
  const S_raw = Math.max(1.0, needPx / Math.max(8, currentFontPx));
  const scale = Math.min(2.0, S_raw); // Cap at 2x for layout sanity
  
  // Generate move hint if significant scaling needed
  const moveHint = scale > 1.3
    ? `Move to ≤ ${farPoint_cm}cm for native clarity`
    : null;
  
  return {
    scale,
    deltaD: ΔD,
    fontPxMin: needPx,
    thetaArcmin: thetaTargetArcmin(ΔD),
    farPointCm: farPoint_cm,
    needsScaling: true,
    moveHint,
  };
}


