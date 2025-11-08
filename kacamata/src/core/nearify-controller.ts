/**
 * Nearify Controller: Manages UI scaling with smooth transitions
 * 
 * Applies EMA (exponential moving average) smoothing to prevent pumping
 * and provides CSS/canvas scaling interface.
 */

import { computeNearifyGuidance, NearifyParams, NearifyGuidance } from './nearify-vision';

/**
 * Exponential Moving Average helper
 * Smooths values over time to prevent jarring changes
 */
class EMA {
  private value: number | undefined;
  
  constructor(private alpha: number = 0.25) {}
  
  update(x: number): number {
    if (this.value === undefined) {
      this.value = x;
    } else {
      this.value = this.alpha * x + (1 - this.alpha) * this.value;
    }
    return this.value;
  }
  
  reset(): void {
    this.value = undefined;
  }
  
  getCurrent(): number {
    return this.value || 1.0;
  }
}

/**
 * Scale snapping configuration
 * Snap to integer-ish values to reduce layout jitter
 */
const SCALE_SNAPS = [1.0, 1.25, 1.5, 1.75, 2.0];

function snapScale(scale: number, threshold: number = 0.05): number {
  // Find closest snap point
  let closest = scale;
  let minDist = Infinity;
  
  for (const snap of SCALE_SNAPS) {
    const dist = Math.abs(scale - snap);
    if (dist < minDist && dist < threshold) {
      minDist = dist;
      closest = snap;
    }
  }
  
  return closest;
}

/**
 * Nearify Controller
 * Manages UI scaling state and transitions
 */
export class NearifyController {
  private scaleEMA: EMA;
  private currentGuidance: NearifyGuidance | null = null;
  private enabled: boolean = true;
  private snapToIntegers: boolean = true;
  
  constructor(emaAlpha: number = 0.25) {
    this.scaleEMA = new EMA(emaAlpha);
  }
  
  /**
   * Update guidance based on current parameters
   * Returns smoothed guidance with EMA-filtered scale
   */
  update(params: NearifyParams): NearifyGuidance {
    // Compute raw guidance
    const rawGuidance = computeNearifyGuidance(params);
    
    // Apply EMA smoothing to scale
    let smoothedScale = this.scaleEMA.update(rawGuidance.scale);
    
    // Optional snap to integer-ish values
    if (this.snapToIntegers) {
      smoothedScale = snapScale(smoothedScale);
    }
    
    // Create smoothed guidance
    this.currentGuidance = {
      ...rawGuidance,
      scale: smoothedScale,
    };
    
    return this.currentGuidance;
  }
  
  /**
   * Get current guidance (cached)
   */
  getGuidance(): NearifyGuidance | null {
    return this.currentGuidance;
  }
  
  /**
   * Reset smoothing state
   */
  reset(): void {
    this.scaleEMA.reset();
    this.currentGuidance = null;
  }
  
  /**
   * Enable/disable Nearify mode
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }
  
  /**
   * Enable/disable scale snapping
   */
  setSnapToIntegers(snap: boolean): void {
    this.snapToIntegers = snap;
  }
  
  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Get scale value for applying to DOM
   * Call applyScaleToDOM(getScaleValue()) from renderer process
   */
  getScaleValue(): number {
    if (!this.currentGuidance || !this.enabled) {
      return 1.0;
    }
    return this.currentGuidance.scale;
  }
  
  /**
   * Apply UI scale to DOM (CSS variable)
   * Should only be called from renderer process
   * Use: nearifyController.applyToDOM() from renderer code
   */
  applyToDOM(): void {
    // This method is meant to be called from renderer/UI code only
    // The actual implementation should be in renderer context
    // For now, just store the guidance
  }
  
  /**
   * Get weight lift for font rendering
   * Light stroke lift for thin fonts when scale < 1.3
   */
  getWeightLift(): number {
    if (!this.currentGuidance || !this.enabled) {
      return 0;
    }
    
    return this.currentGuidance.scale < 1.3 ? 0.2 : 0;
  }
  
  /**
   * Check if subpixel rendering should be enabled
   * Always enable in Nearify mode for best text clarity
   */
  shouldUseSubpixel(): boolean {
    return this.enabled && this.currentGuidance !== null;
  }
}

/**
 * Global Nearify controller instance
 * Use this for singleton pattern across the app
 */
let globalController: NearifyController | null = null;

export function getNearifyController(): NearifyController {
  if (!globalController) {
    globalController = new NearifyController();
  }
  return globalController;
}

/**
 * Apply Nearify scaling to entire application
 * Call this from your main render loop or when distance/rx changes
 */
export function applyNearifyScaling(
  ppi: number,
  distance_cm: number,
  sphere_D: number,
  currentFontPx: number = 14
): NearifyGuidance {
  const controller = getNearifyController();
  
  const guidance = controller.update({
    ppi,
    distance_cm,
    sphere_D,
    currentFontPx,
  });
  
  // Apply to DOM
  controller.applyToDOM();
  
  return guidance;
}

