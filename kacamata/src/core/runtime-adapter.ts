import { PSFParams, VisionModels, WavefrontApprox, Kernel, VoxelLUT } from '../types';
import { WavefrontEngine } from './wavefront-engine';
import { WienerEngine } from './wiener-engine';
import { LFDLUTEngine } from './lfd-lut';

/**
 * Runtime Adapter: Manages distance smoothing, model refresh, and pipeline selection
 */
export class RuntimeAdapter {
  private currentDistance: number = 60; // cm
  private smoothedDistance: number = 60;
  private smoothingAlpha: number = 0.2; // EMA smoothing
  private lastUpdateTime: number = 0;
  private updateInterval: number = 300; // ms
  private distanceThreshold: number = 2; // cm

  private currentModels: VisionModels | null = null;
  private currentParams: PSFParams | null = null;

  /**
   * Update distance with EMA smoothing
   */
  updateDistance(distance_cm: number, skipSmoothing: boolean = false): void {
    this.currentDistance = distance_cm;
    if (skipSmoothing) {
      this.smoothedDistance = distance_cm;
      return;
    }
    this.smoothedDistance =
      this.smoothingAlpha * distance_cm + (1 - this.smoothingAlpha) * this.smoothedDistance;
  }

  /**
   * Get smoothed distance
   */
  getDistance(): number {
    return this.smoothedDistance;
  }

  /**
   * Check if models need refresh and update if needed
   */
  updateModelsIfNeeded(params: PSFParams, lfd_inspired: boolean = false): VisionModels | null {
    const now = Date.now();
    const distanceDelta = Math.abs(this.smoothedDistance - (this.currentParams?.distance_cm || 60));
    const timeDelta = now - this.lastUpdateTime;

    // Refresh if:
    // 1. First time
    // 2. Distance changed significantly (>2cm)
    // 3. Enough time passed (>300ms)
    // 4. Parameters changed
    const needsRefresh =
      !this.currentModels ||
      distanceDelta > this.distanceThreshold ||
      timeDelta > this.updateInterval ||
      this.paramsChanged(params);

    if (needsRefresh) {
      this.currentParams = { ...params, distance_cm: this.smoothedDistance };
      this.currentModels = this.buildModels(this.currentParams, lfd_inspired);
      this.lastUpdateTime = now;
    }

    return this.currentModels;
  }

  /**
   * Check if parameters changed
   */
  private paramsChanged(newParams: PSFParams): boolean {
    if (!this.currentParams) return true;

    return (
      Math.abs(newParams.sphere_D - this.currentParams.sphere_D) > 0.01 ||
      Math.abs((newParams.cylinder_D || 0) - (this.currentParams.cylinder_D || 0)) > 0.01 ||
      Math.abs((newParams.axis_deg || 0) - (this.currentParams.axis_deg || 0)) > 1 ||
      Math.abs(newParams.display_ppi - this.currentParams.display_ppi) > 1 ||
      Math.abs((newParams.display_width_px || 0) - (this.currentParams.display_width_px || 0)) > 1 ||
      Math.abs((newParams.display_height_px || 0) - (this.currentParams.display_height_px || 0)) > 1 ||
      Math.abs((newParams.display_diag_in || 0) - (this.currentParams.display_diag_in || 0)) > 0.1
    );
  }

  /**
   * Build vision models (PSF + optional LUT)
   */
  private buildModels(params: PSFParams, lfd_inspired: boolean): VisionModels {
    // Compute wavefront
    const wavefront = WavefrontEngine.computeWavefront(params);

    // Compute PSF (pass display_ppi directly)
    const psf = WavefrontEngine.wavefrontToPSF(wavefront, params);

    if (psf.is_identity) {
      return {
        psf,
        wavefront,
        lut: undefined,
        last_updated: Date.now(),
      };
    }

    // Generate separable inverse kernels if applicable
    if (psf.separable) {
      const { horiz, vert } = WienerEngine.generateSeparableInverse(psf, 0.008);
      psf.inv_horiz = horiz;
      psf.inv_vert = vert;
    }

    // Build LUT if LFD-inspired mode
    let lut: VoxelLUT | undefined;
    if (lfd_inspired) {
      lut = LFDLUTEngine.buildLUT(wavefront, params);
    }

    return {
      psf,
      wavefront,
      lut,
      last_updated: Date.now(),
    };
  }

  /**
   * Get current models (cached)
   */
  getModels(): VisionModels | null {
    return this.currentModels;
  }
}

