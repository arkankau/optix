import { Kernel, PSFParams } from '../types';
import { pupilSizeFromAmbient } from './phys';

/**
 * PSF Engine with ΔD (excess defocus) model and near-zero bypass
 * 
 * Key improvements:
 * 1. Only applies blur for defocus that exceeds accommodation range
 * 2. Near-zero thresholds prevent over-blur on mild prescriptions
 * 3. Distance-adaptive sigma clamping
 */
export class PSFEngine {
  // Thresholds for "near-zero" prescription (no correction needed)
  static readonly NEAR_ZERO_SPH = 0.25; // Diopters
  static readonly NEAR_ZERO_CYL = 0.50; // Diopters
  
  // Maximum accommodation capacity (age-dependent, use default)
  static readonly Amax_D_DEFAULT = 1.5; // Diopters
  
  // Blur sigma limits
  static readonly SIGMA_MAX_PX = 6.0;
  static readonly SIGMA_MIN_PX = 0.5;
  
  // Distance bounds
  static readonly DIST_MIN_CM = 30;
  static readonly DIST_MAX_CM = 100;

  /**
   * Check if prescription is effectively zero (no correction needed)
   */
  static isNoRx(sphere_D: number, cylinder_D?: number | null): boolean {
    const sphereZero = Math.abs(sphere_D) < this.NEAR_ZERO_SPH;
    const cylinder = cylinder_D === null || cylinder_D === undefined ? 0 : cylinder_D;
    const cylinderZero = Math.abs(cylinder) < this.NEAR_ZERO_CYL;
    return sphereZero && cylinderZero;
  }

  /**
   * Compute excess defocus ΔD (defocus beyond accommodation)
   * 
   * CORRECTED Theory:
   * - For MYOPIA (sphere_D < 0): Cannot accommodate for distance → use |sphere_D| directly
   * - For HYPEROPIA (sphere_D > 0): Can accommodate → only blur if exceeds Amax
   */
  static computeExcessDefocus(
    sphere_D: number,
    distance_cm: number,
    Amax_D: number = this.Amax_D_DEFAULT
  ): number {
    // For myopia: use absolute value directly (they can't see far without correction)
    if (sphere_D < 0) {
      return Math.abs(sphere_D);
    }
    
    // For hyperopia: check if accommodation can handle it
    // At near distances, they might be able to accommodate
    const distance_m = Math.max(0.3, Math.min(1.0, distance_cm / 100));
    const P_needed_near = 1.0 / distance_m; // Extra power needed for near work
    
    // If hyperopic, they need sphere_D PLUS near accommodation
    const total_needed = sphere_D + P_needed_near;
    const deltaD = Math.max(0, total_needed - Amax_D);
    return deltaD;
  }

  /**
   * Convert excess defocus ΔD to blur sigma (pixels)
   * Distance-adaptive and pupil-dependent
   */
  static sigmaFromDefocus(
    deltaD: number,
    distance_cm: number,
    pupil_mm: number = 3.0,
    ppi: number = 110
  ): number {
    if (deltaD < 0.01) return 0;
    
    const distance_clamped = Math.max(this.DIST_MIN_CM, Math.min(this.DIST_MAX_CM, distance_cm));
    
    // Empirical model: σ ∝ ΔD * (pupil/3mm) * (60cm/distance)
    // Scaling factor calibrated to match perceptual blur
    const base_sigma = deltaD * (pupil_mm / 3.0) * (60.0 / distance_clamped);
    
    return Math.max(this.SIGMA_MIN_PX, Math.min(this.SIGMA_MAX_PX, base_sigma));
  }

  /**
   * Compute PSF kernel with ΔD model and near-zero bypass
   */
  static computePSF(params: PSFParams): Kernel {
    const { sphere_D, cylinder_D, axis_deg, distance_cm, display_ppi, ambient_light } = params;
    
    // Check for near-zero prescription
    if (this.isNoRx(sphere_D, cylinder_D)) {
      return this.identityKernel();
    }
    
    // Compute excess defocus
    const deltaD = this.computeExcessDefocus(sphere_D, distance_cm);
    
    // If accommodation can handle it, no correction needed
    if (deltaD < 0.01) {
      return this.identityKernel();
    }
    
    // Estimate pupil size
    const pupil_mm = ambient_light !== undefined && ambient_light !== null
      ? pupilSizeFromAmbient(ambient_light)
      : 3.0;
    
    // Compute base blur from defocus
    let sigma_x = this.sigmaFromDefocus(deltaD, distance_cm, pupil_mm, display_ppi);
    let sigma_y = sigma_x;
    let theta_deg = 0;
    
    // Add astigmatism (elliptical component)
    const cyl = cylinder_D || 0;
    if (Math.abs(cyl) > this.NEAR_ZERO_CYL) {
      const astig_factor = Math.abs(cyl) / 4.0; // Normalize to 0..0.5 range
      sigma_x = sigma_x * (1.0 + astig_factor * 0.5);
      sigma_y = sigma_y * (1.0 - astig_factor * 0.3);
      theta_deg = axis_deg || 0;
    }
    
    // Clamp final values
    sigma_x = Math.max(this.SIGMA_MIN_PX, Math.min(this.SIGMA_MAX_PX, sigma_x));
    sigma_y = Math.max(this.SIGMA_MIN_PX, Math.min(this.SIGMA_MAX_PX, sigma_y));
    
    // Determine kernel size (odd, at least 3x sigma)
    const max_sigma = Math.max(sigma_x, sigma_y);
    const kernel_size = Math.max(15, Math.min(31, Math.ceil(max_sigma * 3) * 2 + 1));
    
    // Check if separable
    const separable = Math.abs(sigma_x - sigma_y) < 0.5 || Math.abs(theta_deg % 90) < 5;
    
    return {
      sigma_x,
      sigma_y,
      theta_deg,
      size: kernel_size,
      separable,
      is_identity: false,
    };
  }

  /**
   * Legacy compatibility wrapper
   * @deprecated Use computePSF() instead
   */
  static computeKernel(params: any): Kernel {
    return this.computePSF(params);
  }

  private static identityKernel(): Kernel {
    return {
      sigma_x: 0,
      sigma_y: 0,
      theta_deg: 0,
      size: 1,
      separable: true,
      inv_horiz: new Float32Array([1]),
      inv_vert: new Float32Array([1]),
      is_identity: true,
    };
  }

  /**
   * Generate Gaussian PSF kernel array (for CPU fallback)
   */
  static generateGaussianKernel(kernel: Kernel): Float32Array {
    const { sigma_x, sigma_y, theta_deg, size } = kernel;
    const center = Math.floor(size / 2);
    const theta_rad = (theta_deg * Math.PI) / 180;
    const cos_theta = Math.cos(theta_rad);
    const sin_theta = Math.sin(theta_rad);

    const kernel_data = new Float32Array(size * size);
    let sum = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;

        // Rotate coordinates
        const rx = dx * cos_theta - dy * sin_theta;
        const ry = dx * sin_theta + dy * cos_theta;

        // Elliptical Gaussian
        const value = Math.exp(
          -0.5 * ((rx * rx) / (sigma_x * sigma_x) + (ry * ry) / (sigma_y * sigma_y))
        );

        kernel_data[y * size + x] = value;
        sum += value;
      }
    }

    // Normalize
    for (let i = 0; i < kernel_data.length; i++) {
      kernel_data[i] /= sum;
    }

    return kernel_data;
  }

  /**
   * Compute Wiener filter frequency response
   * H*(f) / (|H(f)|^2 + λ)
   */
  static computeWienerFilter(kernel: Kernel, lambda: number, width: number, height: number): {
    real: Float32Array;
    imag: Float32Array;
  } {
    const kernel_data = this.generateGaussianKernel(kernel);
    const fft_size = width * height;

    // For MVP, we'll use a simplified approach
    // In production, use proper FFT library (VkFFT, MPS, etc.)
    const real = new Float32Array(fft_size);
    const imag = new Float32Array(fft_size);

    // Simplified: precompute inverse filter approximation
    // This is a placeholder - full implementation would use FFT
    for (let i = 0; i < fft_size; i++) {
      // Placeholder: would compute FFT of PSF here
      real[i] = 1.0; // H*(f) / (|H(f)|^2 + λ)
      imag[i] = 0.0;
    }

    return { real, imag };
  }
}
