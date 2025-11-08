import { PSFParams, ProcessFrameParams, VisionModels, Kernel, VoxelLUT } from '../types';
import { WavefrontEngine } from './wavefront-engine';
import { WienerEngine } from './wiener-engine';
import { LFDLUTEngine } from './lfd-lut';
import { RuntimeAdapter, ExtendedVisionModels } from './runtime-adapter';
import { applyRayPrefilter } from './rayprefilter';
import { PSFEngine } from './psf-engine';
import { computeClearGuidance, ClearGuidance } from './clear-meter';
import { applySubpixelToImage, SubpixelConfig, createSubpixelConfig, createNearifySubpixelConfig } from './text';
import { NearifyController, applyNearifyScaling } from './nearify-controller';
import { NearifyGuidance, isInClearZone } from './nearify-vision';

/**
 * Performance metrics for HUD display
 */
export interface PerformanceMetrics {
  fps: number;
  latency_ms: number;
  frameTime_ms: number;
  lastUpdate: number;
}

/**
 * Auto-Clear configuration
 */
export interface AutoClearConfig {
  enabled: boolean;
  currentFontPx: number;
  subpixelEnabled: boolean;
  perChannelWiener: boolean;
}

/**
 * Vision Engine: Main processing pipeline for anti-blur correction
 * NOW SUPPORTS RAY-BUNDLE PIPELINE with light field display approach
 */
export class VisionEngine {
  private runtimeAdapter: RuntimeAdapter;
  private currentLambda: number = 0.008;
  private currentModels: ExtendedVisionModels | null = null;
  private lfdInspired: boolean = false;
  
  // Performance tracking
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private performanceMetrics: PerformanceMetrics = {
    fps: 0,
    latency_ms: 0,
    frameTime_ms: 0,
    lastUpdate: Date.now(),
  };

  // Auto-Clear system (legacy)
  private autoClearConfig: AutoClearConfig = {
    enabled: false, // Disabled in favor of Nearify
    currentFontPx: 14,
    subpixelEnabled: true,
    perChannelWiener: true,
  };
  private currentClearGuidance: ClearGuidance | null = null;
  private subpixelConfig: SubpixelConfig | null = null;

  // Nearify system (NEW - replaces blur/deblur)
  private nearifyController: NearifyController;
  private nearifyEnabled: boolean = true;
  private currentNearifyGuidance: NearifyGuidance | null = null;

  constructor() {
    this.runtimeAdapter = new RuntimeAdapter();
    this.nearifyController = new NearifyController();
  }

  /**
   * Enable/disable ray-bundle mode
   */
  setRayBundleMode(enabled: boolean, numBundles: number = 6): void {
    this.runtimeAdapter.setRayBundleMode(enabled, numBundles);
  }

  /**
   * Configure Auto-Clear system
   */
  setAutoClearConfig(config: Partial<AutoClearConfig>): void {
    this.autoClearConfig = { ...this.autoClearConfig, ...config };
  }

  /**
   * Get Auto-Clear configuration
   */
  getAutoClearConfig(): AutoClearConfig {
    return { ...this.autoClearConfig };
  }

  /**
   * Get current clear guidance
   */
  getClearGuidance(): ClearGuidance | null {
    return this.currentClearGuidance;
  }

  /**
   * Enable/disable Nearify mode
   */
  setNearifyMode(enabled: boolean): void {
    this.nearifyEnabled = enabled;
    this.nearifyController.setEnabled(enabled);
    
    // When enabling Nearify, disable old Auto-Clear
    if (enabled) {
      this.autoClearConfig.enabled = false;
    }
  }

  /**
   * Check if Nearify is enabled
   */
  isNearifyEnabled(): boolean {
    return this.nearifyEnabled;
  }

  /**
   * Get current Nearify guidance
   */
  getNearifyGuidance(): NearifyGuidance | null {
    return this.currentNearifyGuidance;
  }

  /**
   * Update PSF parameters and recompute models
   */
  updatePSF(params: PSFParams, lfd_inspired: boolean = false): ExtendedVisionModels {
    this.lfdInspired = lfd_inspired;
    
    // NEARIFY MODE: Check if we're in clear zone
    const inClearZone = isInClearZone(params.sphere_D, params.distance_cm);
    
    // Update Nearify guidance
    if (this.nearifyEnabled) {
      this.currentNearifyGuidance = this.nearifyController.update({
        ppi: params.display_ppi,
        distance_cm: params.distance_cm,
        sphere_D: params.sphere_D,
        currentFontPx: 14,
      });
      
      // Apply to DOM
      this.nearifyController.applyToDOM();
      
      // Configure subpixel with weight lift
      const weightLift = this.nearifyController.getWeightLift();
      this.subpixelConfig = createNearifySubpixelConfig(weightLift, true);
    } else {
      // Legacy Auto-Clear path
      const bypass = PSFEngine.isNoRx(params.sphere_D, params.cylinder_D);
      this.runtimeAdapter.updateDistance(params.distance_cm, bypass);
      this.currentModels = this.runtimeAdapter.updateModelsIfNeeded(params, lfd_inspired && !bypass);
      
      if (this.currentModels && this.autoClearConfig.enabled) {
        const deltaD = this.currentModels.deltaD || 0;
        this.currentClearGuidance = computeClearGuidance({
          ppi: params.display_ppi,
          distance_cm: params.distance_cm,
          deltaD,
          currentFontPx: this.autoClearConfig.currentFontPx,
        });
        
        this.subpixelConfig = createSubpixelConfig(deltaD, this.autoClearConfig.subpixelEnabled);
      }
    }
    
    // Update runtime adapter (for legacy path)
    const bypass = inClearZone || this.nearifyEnabled;
    this.runtimeAdapter.updateDistance(params.distance_cm, bypass);
    this.currentModels = this.runtimeAdapter.updateModelsIfNeeded(params, lfd_inspired && !bypass);
    
    return this.currentModels!;
  }

  /**
   * Update distance (with smoothing)
   */
  updateDistance(distance_cm: number): void {
    this.runtimeAdapter.updateDistance(distance_cm);
    // Models will be refreshed automatically on next processFrame if needed
  }

  /**
   * Process a frame with selected pipeline
   * 
   * NEARIFY MODE: Disables blur/deblur filters, just applies subpixel rendering
   * SPLIT VIEW: Forces identity PSF (no deblur) - handled in renderer
   */
  async processFrame(params: ProcessFrameParams): Promise<any> {
    const startTime = performance.now();

    if (!params.psfParams) {
      throw new Error('PSF parameters required');
    }

    // STEP 1: SPLIT VIEW GUARD - Force no deblur when split view is active
    // This is handled at the renderer level, but we ensure identity here too
    const isSplitView = (params as any).splitView === true;
    
    if (isSplitView) {
      // Force passthrough for split view - rendering happens in UI layer
      this.updatePerformanceMetrics(startTime);
      return params.buffer ?? null;
    }

    // NEARIFY MODE: Passthrough with optional subpixel
    if (this.nearifyEnabled) {
      this.updatePerformanceMetrics(startTime);
      
      // Check if in clear zone
      const inClearZone = isInClearZone(params.psfParams.sphere_D, params.psfParams.distance_cm);
      
      if (inClearZone || !params.buffer) {
        // Pixel-perfect passthrough
        return params.buffer ?? null;
      }
      
      // Apply subpixel rendering only (no blur filters)
      if (this.subpixelConfig && this.subpixelConfig.enabled) {
        const { buffer, width, height } = params;
        const input = new Uint8Array(buffer!);
        const output = applySubpixelToImage(input, width, height, this.subpixelConfig);
        this.updatePerformanceMetrics(startTime);
        return output.buffer;
      }
      
      return params.buffer;
    }
    
    // LEGACY MODE: Original blur/deblur pipeline
    const lfd_mode = params.lfd_inspired ?? this.lfdInspired;
    const bypass = PSFEngine.isNoRx(
      params.psfParams.sphere_D,
      params.psfParams.cylinder_D
    );

    this.runtimeAdapter.updateDistance(params.psfParams.distance_cm, bypass);
    const models = this.runtimeAdapter.updateModelsIfNeeded(params.psfParams, lfd_mode && !bypass);

    if (!models) {
      throw new Error('Failed to build vision models');
    }

    // Identity bypass
    if (models.psf.is_identity || models.pipelineMode === 'identity') {
      this.updatePerformanceMetrics(startTime);
      return params.buffer ?? null;
    }

    const lambda = params.lambda || this.currentLambda;
    this.currentLambda = lambda;

    let result: ArrayBuffer | null = null;

    // Select pipeline based on mode
    if (params.buffer) {
      const pipelineMode = models.pipelineMode || 'wiener_only';
      
      if (pipelineMode === 'raybundle' && models.rayLUT) {
        result = this.processFrameRayBundle(params, models.rayLUT);
      } else if (pipelineMode === 'raybundle_wiener' && models.rayLUT) {
        result = this.processFrameRayBundleWiener(params, models.rayLUT, models.psf, lambda);
      } else if (lfd_mode && models.lut) {
        result = this.processFrameLFD(params, models.lut);
      } else {
        result = this.processFrame2D(params, models.psf, lambda);
      }
    }

    this.updatePerformanceMetrics(startTime);
    return result;
  }

  /**
   * Ray-bundle prefilter pipeline (NEW)
   */
  private processFrameRayBundle(
    params: ProcessFrameParams,
    rayLUT: any
  ): ArrayBuffer {
    const { buffer, width, height } = params;
    const input = new Uint8Array(buffer!);
    const result = applyRayPrefilter(input, width, height, rayLUT);
    return result.buffer as ArrayBuffer;
  }

  /**
   * Ray-bundle + Wiener hybrid pipeline (NEW)
   * NOW WITH: Per-channel Wiener + Subpixel
   */
  private processFrameRayBundleWiener(
    params: ProcessFrameParams,
    rayLUT: any,
    kernel: Kernel,
    lambda: number
  ): ArrayBuffer {
    const { buffer, width, height } = params;
    let input = new Uint8Array(buffer!);
    
    // Step 1: Apply subpixel rendering if enabled
    let processedInput: Uint8Array = input;
    if (this.subpixelConfig && this.subpixelConfig.enabled) {
      processedInput = new Uint8Array(applySubpixelToImage(input, width, height, this.subpixelConfig));
    }
    
    // Step 2: Apply ray-bundle prefilter
    const prefiltered = applyRayPrefilter(processedInput, width, height, rayLUT);
    
    // Step 3: Apply Wiener filter (per-channel or uniform)
    let result: Uint8Array;
    if (this.autoClearConfig.perChannelWiener) {
      result = WienerEngine.safeWienerFilterRGB(prefiltered, width, height, kernel, lambda, true);
    } else {
      result = WienerEngine.safeWienerFilter(prefiltered, width, height, kernel, lambda);
    }
    
    return result.buffer as ArrayBuffer;
  }

  /**
   * 2D pre-compensation pipeline (Wiener only)
   * NOW WITH: Per-channel Wiener + Subpixel text rendering
   */
  private processFrame2D(
    params: ProcessFrameParams,
    kernel: Kernel,
    lambda: number
  ): ArrayBuffer {
    const { buffer, width, height } = params;
    let input = new Uint8Array(buffer!);
    
    // Apply subpixel rendering if enabled and configured
    let processedInput: Uint8Array = input;
    if (this.subpixelConfig && this.subpixelConfig.enabled) {
      processedInput = new Uint8Array(applySubpixelToImage(input, width, height, this.subpixelConfig));
    }
    
    // Apply Wiener filter (per-channel or uniform)
    const result = this.autoClearConfig.perChannelWiener
      ? WienerEngine.safeWienerFilterRGB(processedInput, width, height, kernel, lambda, true)
      : WienerEngine.safeWienerFilter(processedInput, width, height, kernel, lambda);
    
    return result.buffer as ArrayBuffer;
  }

  /**
   * LFD-inspired pipeline (legacy)
   */
  private processFrameLFD(params: ProcessFrameParams, lut: VoxelLUT): ArrayBuffer {
    const { buffer, width, height } = params;
    const input = new Uint8Array(buffer!);
    const result = LFDLUTEngine.processFrame(input, width, height, lut);
    return result.buffer as ArrayBuffer;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number): void {
    const endTime = performance.now();
    const frameTime = endTime - startTime;
    
    this.frameCount++;
    this.performanceMetrics.frameTime_ms = frameTime;
    this.performanceMetrics.latency_ms = frameTime;
    
    // Update FPS every second
    if (endTime - this.lastFpsUpdate >= 1000) {
      this.performanceMetrics.fps = this.frameCount;
      this.performanceMetrics.lastUpdate = endTime;
      this.frameCount = 0;
      this.lastFpsUpdate = endTime;
    }
  }


  /**
   * Update lambda based on user feedback
   */
  updateLambda(feedback: 'too_blurry' | 'too_sharp' | 'ok'): void {
    const step = 0.002;
    if (feedback === 'too_blurry') {
      this.currentLambda = Math.max(0.001, this.currentLambda - step);
    } else if (feedback === 'too_sharp') {
      this.currentLambda = Math.min(0.05, this.currentLambda + step);
    }
  }

  getCurrentLambda(): number {
    return this.currentLambda;
  }

  /**
   * Get performance metrics for HUD
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get telemetry for HUD display
   */
  getTelemetry(): any {
    return this.runtimeAdapter.getTelemetry();
  }

  /**
   * Get current models
   */
  getModels(): ExtendedVisionModels | null {
    return this.currentModels;
  }
}


