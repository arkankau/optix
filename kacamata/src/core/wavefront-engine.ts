import { Rx, PSFParams, WavefrontApprox, Kernel } from '../types';

/**
 * Wavefront Engine: Computes wavefront error from prescription and derives PSF
 * Based on Zernike polynomials (defocus Z2^0, astigmatism Z2^±2)
 */
export class WavefrontEngine {
  /**
   * Check if prescription is effectively zero (no correction needed)
   */
  static isNoRx(sphere_D: number, cylinder_D?: number | null): boolean {
    const sphereZero = Math.abs(sphere_D) < 0.1;
    const cylinder = cylinder_D === null || cylinder_D === undefined ? 0 : cylinder_D;
    const cylinderZero = Math.abs(cylinder) < 0.25;
    return sphereZero && cylinderZero;
  }

  /**
   * Approximate wavefront error from prescription
   * W(x,y) ≈ defocus + astigmatism terms
   */
  static computeWavefront(params: PSFParams, pupilRadiusMm: number = 3.0): WavefrontApprox {
    const { sphere_D, cylinder_D, axis_deg, distance_cm } = params;

    if (this.isNoRx(sphere_D, cylinder_D)) {
      return {
        defocus: 0,
        astig_magnitude: 0,
        astig_angle: 0,
        pupil_radius_mm: pupilRadiusMm,
      };
    }

    // Defocus (Zernike Z2^0): maps directly from sphere diopter
    const defocus = sphere_D;

    // Astigmatism (Zernike Z2^±2): from cylinder
    const astig_magnitude = cylinder_D ? Math.abs(cylinder_D) : 0;
    const astig_angle = axis_deg || 0;

    // Estimate pupil size from ambient light (if provided)
    // Brighter = smaller pupil (2-4mm range)
    let pupil_radius = pupilRadiusMm;
    if (params.ambient_light !== null && params.ambient_light !== undefined) {
      // Rough model: 4mm at dark, 2mm at bright
      pupil_radius = 4.0 - (params.ambient_light / 255) * 2.0;
      pupil_radius = Math.max(2.0, Math.min(4.0, pupil_radius));
    }

    return {
      defocus,
      astig_magnitude,
      astig_angle,
      pupil_radius_mm: pupil_radius,
    };
  }

  /**
   * Convert wavefront to Gaussian PSF parameters (screen space)
   * Uses Fraunhofer approximation: PSF ∝ |FT{P(x,y)}|^2
   */
  static wavefrontToPSF(wavefront: WavefrontApprox, params: PSFParams): Kernel {
    if (this.isNoRx(params.sphere_D, params.cylinder_D)) {
      return this.identityKernel();
    }

    const { distance_cm, display_ppi } = params;
    const distance_m = distance_cm / 100;
    const pupil_radius_m = wavefront.pupil_radius_mm / 1000;

    // Defocus blur radius in retinal angle (radians)
    // Simplified: blur_angle ≈ defocus_D * pupil_radius / (2 * focal_length_approx)
    const defocus_abs = Math.abs(wavefront.defocus);
    const blur_angle_rad = (defocus_abs * pupil_radius_m) / 0.017; // ~17mm focal length

    // Convert to screen pixels
    const pixel_size_m = 0.0254 / display_ppi;
    const blur_radius_pixels = (blur_angle_rad * distance_m) / pixel_size_m;

    // Convert to Gaussian sigma (empirical factor)
    let sigma_x = blur_radius_pixels * 0.4;
    let sigma_y = sigma_x;
    let theta_deg = 0;

    // Add astigmatism (elliptical blur)
    if (wavefront.astig_magnitude > 0.1) {
      const astig_blur = (wavefront.astig_magnitude * pupil_radius_m) / 0.017;
      const astig_pixels = (astig_blur * distance_m) / pixel_size_m;

      // Elliptical PSF: major axis along astigmatism direction
      sigma_x = blur_radius_pixels * 0.4 * (1 + astig_pixels * 0.3);
      sigma_y = blur_radius_pixels * 0.4 * (1 - astig_pixels * 0.2);
      theta_deg = wavefront.astig_angle;
    }

    // Clamp sigma values
    sigma_x = Math.max(0.5, Math.min(sigma_x, 15));
    sigma_y = Math.max(0.5, Math.min(sigma_y, 15));

    // Determine kernel size (odd, at least 3x sigma)
    const kernel_size = Math.max(15, Math.min(31, Math.ceil(Math.max(sigma_x, sigma_y) * 3) * 2 + 1));

    // Check if separable (roughly circular or axis-aligned elliptical)
    const separable = Math.abs(sigma_x - sigma_y) < 0.5 || Math.abs(theta_deg % 90) < 5;

    return {
      sigma_x,
      sigma_y,
      theta_deg,
      size: kernel_size,
      separable,
    };
  }

  /**
   * Compute PSF from prescription (convenience method)
   */
  static computePSF(params: PSFParams): Kernel {
    const wavefront = this.computeWavefront(params);
    return this.wavefrontToPSF(wavefront, params);
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
}

