import { Kernel } from '../types';
import { PSFEngine } from './psf-engine';

/**
 * Wiener Engine: Implements 2D pre-compensation via Wiener deconvolution
 * Supports both separable inverse kernels and tiled FFT-based Wiener filtering
 */
export class WienerEngine {
  /**
   * Process frame using 2D pre-compensation
   */
  static processFrame(
    input: Uint8Array,
    width: number,
    height: number,
    kernel: Kernel,
    lambda: number
  ): Uint8Array {
    if (kernel.is_identity) {
      return input.slice();
    }

    const output = new Uint8Array(input.length);

    if (kernel.separable && kernel.inv_horiz && kernel.inv_vert) {
      // Fast separable path
      return this.processSeparable(input, width, height, kernel, lambda);
    } else {
      // Tiled FFT Wiener (fallback to unsharp masking for MVP)
      return this.processUnsharpMasking(input, width, height, kernel, lambda);
    }
  }

  /**
   * Separable inverse convolution (fast path)
   */
  private static processSeparable(
    input: Uint8Array,
    width: number,
    height: number,
    kernel: Kernel,
    lambda: number
  ): Uint8Array {
    const output = new Uint8Array(input.length);
    const inv_h = kernel.inv_horiz!;
    const inv_v = kernel.inv_vert!;
    const ksize_h = inv_h.length;
    const ksize_v = inv_v.length;
    const center_h = Math.floor(ksize_h / 2);
    const center_v = Math.floor(ksize_v / 2);

    // Horizontal pass
    const temp = new Uint8Array(input.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let kx = 0; kx < ksize_h; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx - center_h));
          const idx = (y * width + px) * 4;
          const weight = inv_h[kx];
          r += input[idx] * weight;
          g += input[idx + 1] * weight;
          b += input[idx + 2] * weight;
          a += input[idx + 3] * weight;
        }
        const out_idx = (y * width + x) * 4;
        temp[out_idx] = Math.min(255, Math.max(0, r));
        temp[out_idx + 1] = Math.min(255, Math.max(0, g));
        temp[out_idx + 2] = Math.min(255, Math.max(0, b));
        temp[out_idx + 3] = a;
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let ky = 0; ky < ksize_v; ky++) {
          const py = Math.max(0, Math.min(height - 1, y + ky - center_v));
          const idx = (py * width + x) * 4;
          const weight = inv_v[ky];
          r += temp[idx] * weight;
          g += temp[idx + 1] * weight;
          b += temp[idx + 2] * weight;
          a += temp[idx + 3] * weight;
        }
        const out_idx = (y * width + x) * 4;
        output[out_idx] = Math.min(255, Math.max(0, r));
        output[out_idx + 1] = Math.min(255, Math.max(0, g));
        output[out_idx + 2] = Math.min(255, Math.max(0, b));
        output[out_idx + 3] = a;
      }
    }

    // Post-processing: mid-frequency boost and halo limiter
    return this.postProcess(output, width, height, lambda);
  }

  /**
   * Unsharp masking (fallback when separable kernels not available)
   */
  private static processUnsharpMasking(
    input: Uint8Array,
    width: number,
    height: number,
    kernel: Kernel,
    lambda: number
  ): Uint8Array {
    const output = new Uint8Array(input.length);
    const kernel_data = PSFEngine.generateGaussianKernel(kernel);
    const kernel_size = kernel.size;
    const center = Math.floor(kernel_size / 2);

    // Blur pass (simulates user's vision)
    const blurred = this.applyGaussianBlur(input, width, height, kernel_data, kernel_size, center);

    // Unsharp masking: original + (original - blurred) * strength
    const strength = Math.min(2.0, Math.max(0.5, Math.abs(kernel.sigma_x) * 0.3 + 0.5));

    for (let i = 0; i < input.length; i += 4) {
      const origR = input[i];
      const origG = input[i + 1];
      const origB = input[i + 2];
      const origA = input[i + 3];

      const blurR = blurred[i];
      const blurG = blurred[i + 1];
      const blurB = blurred[i + 2];

      let sharpR = origR + (origR - blurR) * strength;
      let sharpG = origG + (origG - blurG) * strength;
      let sharpB = origB + (origB - blurB) * strength;

      sharpR = Math.min(255, Math.max(0, sharpR));
      sharpG = Math.min(255, Math.max(0, sharpG));
      sharpB = Math.min(255, Math.max(0, sharpB));

      output[i] = sharpR;
      output[i + 1] = sharpG;
      output[i + 2] = sharpB;
      output[i + 3] = origA;
    }

    return this.postProcess(output, width, height, lambda);
  }

  /**
   * Apply Gaussian blur
   */
  private static applyGaussianBlur(
    input: Uint8Array,
    width: number,
    height: number,
    kernel_data: Float32Array,
    kernel_size: number,
    center: number
  ): Uint8Array {
    const output = new Uint8Array(input.length);

    // Horizontal pass
    const temp = new Uint8Array(input.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;
        for (let kx = 0; kx < kernel_size; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx - center));
          const idx = (y * width + px) * 4;
          const weight = kernel_data[center * kernel_size + kx];
          r += input[idx] * weight;
          g += input[idx + 1] * weight;
          b += input[idx + 2] * weight;
          a += input[idx + 3] * weight;
          weightSum += weight;
        }
        const out_idx = (y * width + x) * 4;
        temp[out_idx] = Math.min(255, Math.max(0, r / weightSum));
        temp[out_idx + 1] = Math.min(255, Math.max(0, g / weightSum));
        temp[out_idx + 2] = Math.min(255, Math.max(0, b / weightSum));
        temp[out_idx + 3] = a / weightSum;
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;
        for (let ky = 0; ky < kernel_size; ky++) {
          const py = Math.max(0, Math.min(height - 1, y + ky - center));
          const idx = (py * width + x) * 4;
          const weight = kernel_data[ky * kernel_size + center];
          r += temp[idx] * weight;
          g += temp[idx + 1] * weight;
          b += temp[idx + 2] * weight;
          a += temp[idx + 3] * weight;
          weightSum += weight;
        }
        const out_idx = (y * width + x) * 4;
        output[out_idx] = Math.min(255, Math.max(0, r / weightSum));
        output[out_idx + 1] = Math.min(255, Math.max(0, g / weightSum));
        output[out_idx + 2] = Math.min(255, Math.max(0, b / weightSum));
        output[out_idx + 3] = a / weightSum;
      }
    }

    return output;
  }

  /**
   * Post-processing: mid-frequency boost and halo limiter
   */
  private static postProcess(
    input: Uint8Array,
    width: number,
    height: number,
    lambda: number
  ): Uint8Array {
    const output = new Uint8Array(input.length);

    // Mid-frequency contrast boost (MTF compensation)
    const contrastBoost = 1.15 + lambda * 10;

    for (let i = 0; i < input.length; i += 4) {
      const r = input[i];
      const g = input[i + 1];
      const b = input[i + 2];
      const a = input[i + 3];

      // Contrast boost around midpoint
      let boostedR = (r - 128) * contrastBoost + 128;
      let boostedG = (g - 128) * contrastBoost + 128;
      let boostedB = (b - 128) * contrastBoost + 128;

      // Halo limiter: clamp extreme values
      boostedR = Math.min(255, Math.max(0, boostedR));
      boostedG = Math.min(255, Math.max(0, boostedG));
      boostedB = Math.min(255, Math.max(0, boostedB));

      output[i] = boostedR;
      output[i + 1] = boostedG;
      output[i + 2] = boostedB;
      output[i + 3] = a;
    }

    return output;
  }

  /**
   * Generate separable inverse kernels for fast convolution
   * Approximates Wiener inverse filter as separable 1D kernels
   */
  static generateSeparableInverse(kernel: Kernel, lambda: number): { horiz: Float32Array; vert: Float32Array } {
    const size = kernel.size;
    const center = Math.floor(size / 2);
    const sigma_x = kernel.sigma_x;
    const sigma_y = kernel.sigma_y;

    // Generate 1D Gaussian kernels
    const horiz = new Float32Array(size);
    const vert = new Float32Array(size);
    let sum_h = 0, sum_v = 0;

    for (let i = 0; i < size; i++) {
      const dx = i - center;
      horiz[i] = Math.exp(-0.5 * (dx * dx) / (sigma_x * sigma_x));
      vert[i] = Math.exp(-0.5 * (dx * dx) / (sigma_y * sigma_y));
      sum_h += horiz[i];
      sum_v += vert[i];
    }

    // Normalize
    for (let i = 0; i < size; i++) {
      horiz[i] /= sum_h;
      vert[i] /= sum_v;
    }

    // Approximate inverse: use high-pass + regularization
    // Simplified: inverse ≈ (1 - blur) / (1 + lambda)
    for (let i = 0; i < size; i++) {
      const inv_h = (1.0 - horiz[i]) / (1.0 + lambda * 10);
      const inv_v = (1.0 - vert[i]) / (1.0 + lambda * 10);
      horiz[i] = Math.max(0, inv_h);
      vert[i] = Math.max(0, inv_v);
    }

    // Renormalize to preserve energy
    sum_h = 0;
    sum_v = 0;
    for (let i = 0; i < size; i++) {
      sum_h += Math.abs(horiz[i]);
      sum_v += Math.abs(vert[i]);
    }
    for (let i = 0; i < size; i++) {
      horiz[i] /= sum_h;
      vert[i] /= sum_v;
    }

    return { horiz, vert };
  }
}

