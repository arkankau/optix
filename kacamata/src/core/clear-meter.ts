/**
 * Clear Meter: Auto-Clear Size calculations for myopia
 * 
 * Goal: When ΔD > 0, compute recommended UI scale so text stays legible
 * without heavy deconvolution. Bigger, clearer text > aggressive sharpening.
 */

/**
 * Compute pixels per degree (PPD) of visual angle
 * PPD = PPI * (π/180) * distance_inches
 */
export function pixelsPerDegree(ppi: number, distance_cm: number): number {
  const distance_inches = distance_cm / 2.54;
  return ppi * (Math.PI / 180) * distance_inches;
}

/**
 * Target legible text size in arcminutes based on ΔD
 * More blur → need larger text
 * 
 * Mapping: 12 arcmin (ΔD≈0.5D) → 20 arcmin (ΔD≥1.5D)
 */
export function targetArcmin(deltaD: number): number {
  // Linear interpolation from 12 to 20 arcmin over ΔD range 0.5-1.5D
  const t = 12 + 8 * Math.min(1, Math.max(0, (deltaD - 0.5) / 1.0));
  return Math.max(10, Math.min(22, t));
}

/**
 * Minimum font size (px) for legibility given blur
 * 
 * @param ppi Display PPI
 * @param distance_cm Viewing distance
 * @param deltaD Excess defocus (diopters)
 * @param xh x-height fraction of font size (typically 0.5)
 */
export function minFontPx(
  ppi: number,
  distance_cm: number,
  deltaD: number,
  xh: number = 0.5
): number {
  const ppd = pixelsPerDegree(ppi, distance_cm);
  const theta = targetArcmin(deltaD); // arcmin
  
  // Convert arcmin to degrees, then to pixels
  const xh_clamped = Math.max(0.35, Math.min(0.7, xh));
  const px = (theta / 60) * ppd / xh_clamped;
  
  return Math.ceil(px);
}

/**
 * Minimum stroke width for legibility (px)
 * Below this, strokes become too thin after blur
 */
export function minStrokeWidth(deltaD: number): number {
  // Base minimum + extra for blur
  const base = 1.2;
  const extra = deltaD * 0.15; // Add 0.15px per diopter
  return Math.max(1.0, base + extra);
}

/**
 * Clear guidance parameters
 */
export interface ClearGuidance {
  fontPx: number;           // Recommended minimum font size
  strokeMin: number;        // Recommended minimum stroke width
  thetaArcmin: number;      // Target angular size
  ppd: number;              // Pixels per degree
  scaleFactor: number;      // Suggested UI scale multiplier (1.0 = no change)
  needsAutoScale: boolean;  // True if current size is below recommendation
}

/**
 * Compute comprehensive clear guidance
 */
export function computeClearGuidance(params: {
  ppi: number;
  distance_cm: number;
  deltaD: number;
  currentFontPx?: number;  // Current UI font size for comparison
  xHeight?: number;         // x-height fraction (default 0.5)
}): ClearGuidance {
  const { ppi, distance_cm, deltaD, currentFontPx = 14, xHeight = 0.5 } = params;
  
  // No adjustment needed for near-zero blur
  if (deltaD < 0.1) {
    return {
      fontPx: currentFontPx,
      strokeMin: 1.0,
      thetaArcmin: 12,
      ppd: pixelsPerDegree(ppi, distance_cm),
      scaleFactor: 1.0,
      needsAutoScale: false,
    };
  }
  
  const ppd = pixelsPerDegree(ppi, distance_cm);
  const thetaArcmin = targetArcmin(deltaD);
  const fontPx = minFontPx(ppi, distance_cm, deltaD, xHeight);
  const strokeMin = minStrokeWidth(deltaD);
  
  // Calculate scale factor if current font is smaller than recommended
  const scaleFactor = currentFontPx < fontPx ? fontPx / currentFontPx : 1.0;
  const needsAutoScale = scaleFactor > 1.05; // 5% threshold to avoid tiny adjustments
  
  return {
    fontPx,
    strokeMin,
    thetaArcmin,
    ppd,
    scaleFactor: Math.min(2.0, scaleFactor), // Cap at 2x
    needsAutoScale,
  };
}

/**
 * Compute stroke lift for font-weight synthesis
 * When blurred, fonts appear lighter - compensate by thickening slightly
 */
export function computeStrokeLift(deltaD: number): number {
  if (deltaD < 0.1) return 0;
  
  // Linear: 0.1px at 0.5D, 0.3px at 1.5D+
  const lift = 0.1 + 0.2 * Math.min(1, Math.max(0, (deltaD - 0.5) / 1.0));
  return Math.max(0, Math.min(0.35, lift));
}

/**
 * Format guidance for HUD display
 */
export function formatGuidanceForHUD(guidance: ClearGuidance): {
  label: string;
  value: string;
  color: string;
  recommendation: string;
} {
  const status = guidance.needsAutoScale ? 'NEEDS SCALING' : 'OPTIMAL';
  const color = guidance.needsAutoScale ? '#ff9900' : '#00ff00';
  
  return {
    label: 'Clear Meter',
    value: `${guidance.thetaArcmin.toFixed(1)}′ → ${guidance.fontPx}px`,
    color,
    recommendation: guidance.needsAutoScale
      ? `Scale UI ${(guidance.scaleFactor * 100).toFixed(0)}% for optimal clarity`
      : 'Text size optimal for current blur',
  };
}

/**
 * Smooth scale factor transitions to avoid jarring changes
 * Uses exponential moving average
 */
export class SmoothScaleAdapter {
  private currentScale: number = 1.0;
  private alpha: number = 0.15; // Smoothing factor
  
  update(targetScale: number): number {
    this.currentScale = this.alpha * targetScale + (1 - this.alpha) * this.currentScale;
    return this.currentScale;
  }
  
  reset(): void {
    this.currentScale = 1.0;
  }
  
  getCurrent(): number {
    return this.currentScale;
  }
}


