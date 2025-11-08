"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PSFEngine = void 0;
const wavefront_engine_1 = require("./wavefront-engine");
const fft_utils_1 = require("./fft-utils");
/**
 * PSF Engine: Legacy compatibility wrapper
 * Now uses WavefrontEngine internally
 */
class PSFEngine {
    /**
     * Compute PSF kernel parameters from diopter and distance
     * @deprecated Use WavefrontEngine.computePSF() instead
     */
    static computeKernel(params) {
        return wavefront_engine_1.WavefrontEngine.computePSF(params);
    }
    /**
     * Generate Gaussian PSF kernel array (for CPU fallback)
     */
    static generateGaussianKernel(kernel) {
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
                const value = Math.exp(-0.5 * ((rx * rx) / (sigma_x * sigma_x) + (ry * ry) / (sigma_y * sigma_y)));
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
     * Compute Wiener filter frequency response for 2D kernel
     * W(f) = H*(f) / (|H(f)|^2 + λ)
     *
     * Note: This computes the full 2D Wiener filter. For separable kernels,
     * use generateSeparableInverse() in WienerEngine for better performance.
     */
    static computeWienerFilter(kernel, lambda, width, height) {
        // Generate PSF kernel
        const kernel_data = this.generateGaussianKernel(kernel);
        const kernel_size = kernel.size;
        // Create padded kernel to match image dimensions (centered)
        const padded_kernel = new Float32Array(width * height);
        const center_k = Math.floor(kernel_size / 2);
        const offset_x = Math.floor((width - kernel_size) / 2);
        const offset_y = Math.floor((height - kernel_size) / 2);
        for (let ky = 0; ky < kernel_size; ky++) {
            for (let kx = 0; kx < kernel_size; kx++) {
                const px = offset_x + kx;
                const py = offset_y + ky;
                if (px >= 0 && px < width && py >= 0 && py < height) {
                    padded_kernel[py * width + px] = kernel_data[ky * kernel_size + kx];
                }
            }
        }
        // Compute 2D FFT of PSF kernel
        // Note: For production, use optimized 2D FFT library (VkFFT, MPS, etc.)
        // This is a simplified implementation using row-column decomposition
        const h_fft = (0, fft_utils_1.compute2DFFT)(padded_kernel, width, height);
        // Compute Wiener filter: W(f) = H*(f) / (|H(f)|^2 + λ)
        const h_conj = (0, fft_utils_1.complexConjugate)(h_fft.real, h_fft.imag, width * height);
        const mag2 = (0, fft_utils_1.magnitudeSquared)(h_fft.real, h_fft.imag, width * height);
        const w_real = new Float32Array(width * height);
        const w_imag = new Float32Array(width * height);
        const epsilon = 1e-10;
        for (let i = 0; i < width * height; i++) {
            const denominator = mag2[i] + lambda;
            if (denominator < epsilon) {
                w_real[i] = 0;
                w_imag[i] = 0;
            }
            else {
                w_real[i] = h_conj.real[i] / denominator;
                w_imag[i] = h_conj.imag[i] / denominator;
            }
        }
        return { real: w_real, imag: w_imag };
    }
}
exports.PSFEngine = PSFEngine;
