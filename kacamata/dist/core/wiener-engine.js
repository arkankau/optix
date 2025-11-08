"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WienerEngine = void 0;
const psf_engine_1 = require("./psf-engine");
const fft_utils_1 = require("./fft-utils");
/**
 * Wiener Engine: Implements 2D pre-compensation via Wiener deconvolution
 * Supports both separable inverse kernels and tiled FFT-based Wiener filtering
 */
class WienerEngine {
    /**
     * Process frame using 2D pre-compensation
     */
    static processFrame(input, width, height, kernel, lambda, contrastBoost) {
        if (kernel.is_identity) {
            return input.slice();
        }
        const output = new Uint8Array(input.length);
        if (kernel.separable && kernel.inv_horiz && kernel.inv_vert) {
            // Fast separable path
            return this.processSeparable(input, width, height, kernel, lambda, contrastBoost);
        }
        else {
            // Tiled FFT Wiener (fallback to unsharp masking for MVP)
            return this.processUnsharpMasking(input, width, height, kernel, lambda, contrastBoost);
        }
    }
    /**
     * Separable inverse convolution (fast path)
     */
    static processSeparable(input, width, height, kernel, lambda, contrastBoost) {
        const output = new Uint8Array(input.length);
        const inv_h = kernel.inv_horiz;
        const inv_v = kernel.inv_vert;
        const ksize_h = inv_h.length;
        const ksize_v = inv_v.length;
        const center_h = Math.floor(ksize_h / 2);
        const center_v = Math.floor(ksize_v / 2);
        // Horizontal pass
        const temp = new Float32Array(input.length);
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
                // Use Float32Array to preserve precision, clamp later
                temp[out_idx] = r;
                temp[out_idx + 1] = g;
                temp[out_idx + 2] = b;
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
                // Clamp to valid range with proper rounding
                output[out_idx] = Math.min(255, Math.max(0, Math.round(r)));
                output[out_idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
                output[out_idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
                output[out_idx + 3] = Math.min(255, Math.max(0, Math.round(a)));
            }
        }
        // Post-processing: mid-frequency boost and halo limiter
        return this.postProcess(output, width, height, lambda, contrastBoost);
    }
    /**
     * Unsharp masking (fallback when separable kernels not available)
     */
    static processUnsharpMasking(input, width, height, kernel, lambda, contrastBoost) {
        const output = new Uint8Array(input.length);
        const kernel_data = psf_engine_1.PSFEngine.generateGaussianKernel(kernel);
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
        return this.postProcess(output, width, height, lambda, contrastBoost);
    }
    /**
     * Apply Gaussian blur
     */
    static applyGaussianBlur(input, width, height, kernel_data, kernel_size, center) {
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
     * Post-processing: gentle tone mapping and halo limiter
     * Reduced contrast boost to prevent over-amplification
     */
    static postProcess(input, width, height, lambda, userContrastBoost) {
        const output = new Uint8Array(input.length);
        // Use user-provided contrast boost, or fallback to minimal auto-boost
        // User can control this via slider (0.8 to 1.3)
        const contrastBoost = userContrastBoost !== undefined
            ? userContrastBoost
            : (1.0 + Math.min(0.1, lambda * 2)); // Max 1.1x boost if not specified
        for (let i = 0; i < input.length; i += 4) {
            const r = input[i];
            const g = input[i + 1];
            const b = input[i + 2];
            const a = input[i + 3];
            // Gentle contrast boost around midpoint
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
     * Generate separable inverse kernels using proper Wiener filter formula
     * Computes Wiener filter in frequency domain: W(f) = H*(f) / (|H(f)|² + λ)
     * Then converts back to spatial domain via IFFT
     */
    static generateSeparableInverse(kernel, lambda) {
        // Ensure lambda is in reasonable range
        lambda = Math.max(0.001, Math.min(0.1, lambda));
        const size = kernel.size;
        const center = Math.floor(size / 2);
        const sigma_x = kernel.sigma_x;
        const sigma_y = kernel.sigma_y;
        // Generate 1D Gaussian kernels (spatial domain)
        const h_horiz = new Float32Array(size);
        const h_vert = new Float32Array(size);
        let sum_h = 0, sum_v = 0;
        for (let i = 0; i < size; i++) {
            const dx = i - center;
            h_horiz[i] = Math.exp(-0.5 * (dx * dx) / (sigma_x * sigma_x));
            h_vert[i] = Math.exp(-0.5 * (dx * dx) / (sigma_y * sigma_y));
            sum_h += h_horiz[i];
            sum_v += h_vert[i];
        }
        // Normalize kernels
        for (let i = 0; i < size; i++) {
            h_horiz[i] /= sum_h;
            h_vert[i] /= sum_v;
        }
        // Compute 1D FFT of Gaussian kernels
        const h_horiz_fft = (0, fft_utils_1.compute1DFFT)(h_horiz);
        const h_vert_fft = (0, fft_utils_1.compute1DFFT)(h_vert);
        // Compute Wiener filter in frequency domain: W(f) = H*(f) / (|H(f)|² + λ)
        const w_horiz_fft = (0, fft_utils_1.computeWienerFilter1D)(h_horiz_fft.real, h_horiz_fft.imag, lambda);
        const w_vert_fft = (0, fft_utils_1.computeWienerFilter1D)(h_vert_fft.real, h_vert_fft.imag, lambda);
        // Convert Wiener filter back to spatial domain via IFFT
        const w_horiz_spatial = (0, fft_utils_1.compute1DIFFT)(w_horiz_fft.real, w_horiz_fft.imag);
        const w_vert_spatial = (0, fft_utils_1.compute1DIFFT)(w_vert_fft.real, w_vert_fft.imag);
        // Normalize to ensure proper scaling
        // The inverse kernel should have unit DC response (sum = 1) when convolved with original
        let sum_inv_h = 0;
        let sum_inv_v = 0;
        for (let i = 0; i < size; i++) {
            sum_inv_h += w_horiz_spatial[i];
            sum_inv_v += w_vert_spatial[i];
        }
        // If sum is near zero, the filter might be unstable - use identity
        const epsilon = 1e-6;
        if (Math.abs(sum_inv_h) < epsilon || Math.abs(sum_inv_v) < epsilon) {
            // Fallback: return identity kernel (no correction)
            const identity_h = new Float32Array(size);
            const identity_v = new Float32Array(size);
            identity_h[center] = 1.0;
            identity_v[center] = 1.0;
            return { horiz: identity_h, vert: identity_v };
        }
        // Normalize so that convolution with original kernel ≈ delta function
        // But also clamp extreme values to prevent artifacts
        const horiz = new Float32Array(size);
        const vert = new Float32Array(size);
        // Find max absolute value to prevent overflow
        let max_abs_h = 0;
        let max_abs_v = 0;
        for (let i = 0; i < size; i++) {
            max_abs_h = Math.max(max_abs_h, Math.abs(w_horiz_spatial[i]));
            max_abs_v = Math.max(max_abs_v, Math.abs(w_vert_spatial[i]));
        }
        // Normalize and clamp to reasonable range
        // Limit kernel values to prevent extreme amplification
        const max_kernel_value = 5.0; // Prevent kernels from being too extreme
        const scale_h = Math.min(1.0, max_kernel_value / max_abs_h);
        const scale_v = Math.min(1.0, max_kernel_value / max_abs_v);
        for (let i = 0; i < size; i++) {
            horiz[i] = w_horiz_spatial[i] * scale_h;
            vert[i] = w_vert_spatial[i] * scale_v;
        }
        return { horiz, vert };
    }
}
exports.WienerEngine = WienerEngine;
