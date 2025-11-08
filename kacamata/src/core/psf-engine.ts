import { Kernel } from '../types';
import { WavefrontEngine } from './wavefront-engine';

/**
 * PSF Engine: Legacy compatibility wrapper
 * Now uses WavefrontEngine internally
 */
export class PSFEngine {
  /**
   * Compute PSF kernel parameters from diopter and distance
   * @deprecated Use WavefrontEngine.computePSF() instead
   */
  static computeKernel(params: any): Kernel {
    return WavefrontEngine.computePSF(params);
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
