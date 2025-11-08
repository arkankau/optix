import { PSFParams, ProcessFrameParams, VisionModels, Kernel, VoxelLUT } from '../types';
import { WavefrontEngine } from './wavefront-engine';
import { WienerEngine } from './wiener-engine';
import { LFDLUTEngine } from './lfd-lut';
import { RuntimeAdapter } from './runtime-adapter';

/**
 * Vision Engine: Main processing pipeline for anti-blur correction
 * Supports both 2D pre-compensation and LFD-inspired modes
 */
export class VisionEngine {
  private runtimeAdapter: RuntimeAdapter;
  private currentLambda: number = 0.008;
  private currentModels: VisionModels | null = null;
  private lfdInspired: boolean = false;

  constructor() {
    this.runtimeAdapter = new RuntimeAdapter();
  }

  /**
   * Update PSF parameters and recompute models
   */
  updatePSF(params: PSFParams, lfd_inspired: boolean = false): VisionModels {
    this.lfdInspired = lfd_inspired;
    const bypass = WavefrontEngine.isNoRx(params.sphere_D, params.cylinder_D);
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
   */
  async processFrame(params: ProcessFrameParams): Promise<any> {
    const lfd_mode = params.lfd_inspired ?? this.lfdInspired;

    // Ensure models are up to date
    if (!params.psfParams) {
      throw new Error('PSF parameters required');
    }

    const bypass = WavefrontEngine.isNoRx(
      params.psfParams.sphere_D,
      params.psfParams.cylinder_D
    );

    this.runtimeAdapter.updateDistance(params.psfParams.distance_cm, bypass);
    const models = this.runtimeAdapter.updateModelsIfNeeded(params.psfParams, lfd_mode && !bypass);

    if (!models) {
      throw new Error('Failed to build vision models');
    }

    if (models.psf.is_identity) {
      // Passthrough for identity PSF
      return params.buffer ?? null;
    }

    const lambda = params.lambda || this.currentLambda;
    this.currentLambda = lambda;

    // Select pipeline based on mode
    if (params.buffer) {
      if (lfd_mode && models.lut) {
        return this.processFrameLFD(params, models.lut);
      } else {
        return this.processFrame2D(params, models.psf, lambda);
      }
    }

    // GPU path (placeholder - would use native addon)
    return null;
  }

  /**
   * 2D pre-compensation pipeline
   */
  private processFrame2D(
    params: ProcessFrameParams,
    kernel: Kernel,
    lambda: number
  ): ArrayBuffer {
    const { buffer, width, height, contrast_boost } = params;
    const input = new Uint8Array(buffer!);
    const result = WienerEngine.processFrame(input, width, height, kernel, lambda, contrast_boost);
    return result.buffer as ArrayBuffer;
  }

  /**
   * LFD-inspired pipeline
   */
  private processFrameLFD(params: ProcessFrameParams, lut: VoxelLUT): ArrayBuffer {
    const { buffer, width, height } = params;
    const input = new Uint8Array(buffer!);
    const result = LFDLUTEngine.processFrame(input, width, height, lut);
    return result.buffer as ArrayBuffer;
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
}


