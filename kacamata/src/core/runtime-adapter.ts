import { PSFParams, VisionModels, WavefrontApprox, Kernel, VoxelLUT } from '../types';
import { WavefrontEngine } from './wavefront-engine';
import { WienerEngine } from './wiener-engine';
import { LFDLUTEngine } from './lfd-lut';
import { PSFEngine } from './psf-engine';
import { buildRayLUT, RayLUT } from './rayprefilter';
import { refineRayLUT, RefinementMetrics } from './lut-refine';

/**
 * Extended vision models with ray-bundle support
 */
export interface ExtendedVisionModels extends VisionModels {
  rayLUT?: RayLUT;
  refinementMetrics?: RefinementMetrics;
  deltaD?: number;  // Excess defocus
  pipelineMode?: 'identity' | 'raybundle' | 'raybundle_wiener' | 'wiener_only';
}

/**
 * Runtime Adapter: Manages distance smoothing, model refresh, and pipeline selection
 * 
 * NOW WITH RAY-BUNDLE SUPPORT:
 * - Builds ray-bundle LUT for light field display approach
 * - Optional LUT refinement with retinal blur optimization
 * - Intelligent pipeline selection based on ΔD
 * - Identity bypass for near-zero cases
 */
export class RuntimeAdapter {
  private currentDistance: number = 60; // cm
  private smoothedDistance: number = 60;
  private smoothingAlpha: number = 0.2; // EMA smoothing
  private lastUpdateTime: number = 0;
  private updateInterval: number = 300; // ms
  private distanceThreshold: number = 2; // cm

  private currentModels: ExtendedVisionModels | null = null;
  private currentParams: PSFParams | null = null;
  private enableRayBundle: boolean = true;  // Enable ray-bundle pipeline
  private enableRefinement: boolean = true;  // Enable LUT refinement
  private numBundles: number = 6;  // Default ray bundle count

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
   * Enable/disable ray-bundle pipeline
   */
  setRayBundleMode(enabled: boolean, numBundles: number = 6): void {
    this.enableRayBundle = enabled;
    this.numBundles = numBundles;
    this.currentModels = null; // Force rebuild
  }

  /**
   * Enable/disable LUT refinement
   */
  setRefinementMode(enabled: boolean): void {
    this.enableRefinement = enabled;
  }

  /**
   * Check if models need refresh and update if needed
   */
  updateModelsIfNeeded(params: PSFParams, lfd_inspired: boolean = false): ExtendedVisionModels | null {
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
   * Build vision models (PSF + optional LUT + ray-bundle)
   */
  private buildModels(params: PSFParams, lfd_inspired: boolean): ExtendedVisionModels {
    // Use new PSF engine with ΔD model
    const psf = PSFEngine.computePSF(params);
    const deltaD = PSFEngine.computeExcessDefocus(params.sphere_D, params.distance_cm);
    
    // Also compute wavefront for compatibility
    const wavefront = WavefrontEngine.computeWavefront(params);

    // Identity bypass
    if (psf.is_identity || deltaD < 0.01) {
      return {
        psf,
        wavefront,
        lut: undefined,
        rayLUT: undefined,
        deltaD,
        pipelineMode: 'identity',
        last_updated: Date.now(),
      };
    }

    // Generate separable inverse kernels if applicable
    if (psf.separable) {
      const { horiz, vert } = WienerEngine.generateSeparableInverse(psf, 0.008);
      psf.inv_horiz = horiz;
      psf.inv_vert = vert;
    }

    // Build old LUT if LFD-inspired mode (legacy)
    let lut: VoxelLUT | undefined;
    if (lfd_inspired && !this.enableRayBundle) {
      lut = LFDLUTEngine.buildLUT(wavefront, params);
    }

    // Build ray-bundle LUT (new approach)
    let rayLUT: RayLUT | undefined;
    let refinementMetrics: RefinementMetrics | undefined;
    let pipelineMode: 'raybundle' | 'raybundle_wiener' | 'wiener_only' = 'wiener_only';
    
    if (this.enableRayBundle && deltaD > 0.01) {
      rayLUT = buildRayLUT(params, this.numBundles);
      
      // Optional refinement
      if (this.enableRefinement && rayLUT.num_bundles > 1) {
        const refined = refineRayLUT(rayLUT, psf, params, null, 2, 2.0);
        rayLUT = refined.lut;
        refinementMetrics = refined.metrics;
      }
      
      // Choose pipeline mode based on deltaD
      if (deltaD > 1.0) {
        pipelineMode = 'raybundle_wiener'; // Use both for strong corrections
      } else {
        pipelineMode = 'raybundle'; // Ray-bundle alone for mild cases
      }
    }

    return {
      psf,
      wavefront,
      lut,
      rayLUT,
      refinementMetrics,
      deltaD,
      pipelineMode,
      last_updated: Date.now(),
    };
  }

  /**
   * Get current models (cached)
   */
  getModels(): ExtendedVisionModels | null {
    return this.currentModels;
  }

  /**
   * Get telemetry for HUD display
   */
  getTelemetry(): {
    deltaD: number;
    sigma_x: number;
    sigma_y: number;
    theta: number;
    numBundles: number;
    pipelineMode: string;
    refinementDelta?: number;
    refinementIters?: number;
  } | null {
    if (!this.currentModels) return null;
    
    const models = this.currentModels;
    return {
      deltaD: models.deltaD || 0,
      sigma_x: models.psf.sigma_x,
      sigma_y: models.psf.sigma_y,
      theta: models.psf.theta_deg,
      numBundles: models.rayLUT?.num_bundles || 0,
      pipelineMode: models.pipelineMode || 'unknown',
      refinementDelta: models.refinementMetrics?.delta_loss,
      refinementIters: models.refinementMetrics?.iterations,
    };
  }
}

