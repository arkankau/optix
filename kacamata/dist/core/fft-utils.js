"use strict";
/**
 * FFT Utilities for frequency-domain processing
 * Provides helper functions for 1D and 2D FFT operations
 *
 * Note: For small kernels (15-31 pixels), we use a simple DFT implementation
 * For production with larger images, use optimized FFT libraries (VkFFT, MPS, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.compute1DFFT = compute1DFFT;
exports.compute1DIFFT = compute1DIFFT;
exports.compute2DFFT = compute2DFFT;
exports.complexConjugate = complexConjugate;
exports.magnitudeSquared = magnitudeSquared;
exports.computeWienerFilter1D = computeWienerFilter1D;
/**
 * Simple 1D DFT implementation (for small kernels)
 * More reliable than external libraries for small sizes
 */
function dft1D(signal) {
    const N = signal.length;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    const twoPiOverN = (2 * Math.PI) / N;
    for (let k = 0; k < N; k++) {
        let realSum = 0;
        let imagSum = 0;
        for (let n = 0; n < N; n++) {
            const angle = -twoPiOverN * k * n;
            const cosVal = Math.cos(angle);
            const sinVal = Math.sin(angle);
            realSum += signal[n] * cosVal;
            imagSum += signal[n] * sinVal;
        }
        real[k] = realSum;
        imag[k] = imagSum;
    }
    return { real, imag };
}
/**
 * Simple 1D IDFT implementation
 */
function idft1D(real, imag) {
    const N = real.length;
    const output = new Float32Array(N);
    const twoPiOverN = (2 * Math.PI) / N;
    const scale = 1.0 / N;
    for (let n = 0; n < N; n++) {
        let realSum = 0;
        for (let k = 0; k < N; k++) {
            const angle = twoPiOverN * k * n;
            realSum += real[k] * Math.cos(angle) - imag[k] * Math.sin(angle);
        }
        output[n] = realSum * scale;
    }
    return output;
}
/**
 * Compute 1D FFT and return real/imaginary arrays
 * Uses simple DFT for small kernels (more reliable)
 */
function compute1DFFT(signal) {
    // For small kernels (<= 64), use simple DFT
    // For larger sizes, would use FFT library
    if (signal.length <= 64) {
        return dft1D(signal);
    }
    // Fallback: try to use fft-js if available for larger sizes
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { fft } = require('fft-js');
        const phasors = Array.from(signal).map(x => ({ real: x, imag: 0 }));
        const result = fft(phasors);
        const real = new Float32Array(result.length);
        const imag = new Float32Array(result.length);
        for (let i = 0; i < result.length; i++) {
            real[i] = result[i].real;
            imag[i] = result[i].imag;
        }
        return { real, imag };
    }
    catch {
        // Fallback to DFT if library not available
        return dft1D(signal);
    }
}
/**
 * Compute 1D IFFT
 */
function compute1DIFFT(real, imag) {
    // For small kernels, use simple IDFT
    if (real.length <= 64) {
        return idft1D(real, imag);
    }
    // Fallback: try to use fft-js if available
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ifft } = require('fft-js');
        const phasors = Array.from({ length: real.length }, (_, i) => ({
            real: real[i],
            imag: imag[i],
        }));
        const result = ifft(phasors);
        const output = new Float32Array(real.length);
        for (let i = 0; i < real.length; i++) {
            output[i] = result[i].real;
        }
        return output;
    }
    catch {
        // Fallback to IDFT if library not available
        return idft1D(real, imag);
    }
}
/**
 * Compute 2D FFT using row-column decomposition
 * This is a simplified version - for production, use optimized 2D FFT library
 */
function compute2DFFT(data, width, height) {
    const size = width * height;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    // Initialize with input data
    for (let i = 0; i < size; i++) {
        real[i] = data[i];
        imag[i] = 0;
    }
    // Row-wise 1D FFT
    const rowFFTReal = new Float32Array(width);
    const rowFFTImag = new Float32Array(width);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            rowFFTReal[x] = real[y * width + x];
            rowFFTImag[x] = imag[y * width + x];
        }
        const rowResult = compute1DFFT(rowFFTReal);
        for (let x = 0; x < width; x++) {
            real[y * width + x] = rowResult.real[x];
            imag[y * width + x] = rowResult.imag[x];
        }
    }
    // Column-wise 1D FFT
    const colFFTReal = new Float32Array(height);
    const colFFTImag = new Float32Array(height);
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            colFFTReal[y] = real[y * width + x];
            colFFTImag[y] = imag[y * width + x];
        }
        const colResult = compute1DFFT(colFFTReal);
        for (let y = 0; y < height; y++) {
            real[y * width + x] = colResult.real[y];
            imag[y * width + x] = colResult.imag[y];
        }
    }
    return { real, imag };
}
/**
 * Compute complex conjugate
 */
function complexConjugate(real, imag, length) {
    const conjReal = new Float32Array(length);
    const conjImag = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        conjReal[i] = real[i];
        conjImag[i] = -imag[i];
    }
    return { real: conjReal, imag: conjImag };
}
/**
 * Compute magnitude squared: |H(f)|² = real² + imag²
 */
function magnitudeSquared(real, imag, length) {
    const mag2 = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        mag2[i] = real[i] * real[i] + imag[i] * imag[i];
    }
    return mag2;
}
/**
 * Compute Wiener filter in frequency domain: W(f) = H*(f) / (|H(f)|² + λ)
 */
function computeWienerFilter1D(hReal, hImag, lambda) {
    const N = hReal.length;
    const wReal = new Float32Array(N);
    const wImag = new Float32Array(N);
    // Compute H*(f) and |H(f)|²
    const hConj = complexConjugate(hReal, hImag, N);
    const mag2 = magnitudeSquared(hReal, hImag, N);
    // Compute W(f) = H*(f) / (|H(f)|² + λ)
    const epsilon = 1e-10; // Prevent division by zero
    for (let i = 0; i < N; i++) {
        const denominator = mag2[i] + lambda;
        if (denominator < epsilon) {
            wReal[i] = 0;
            wImag[i] = 0;
        }
        else {
            wReal[i] = hConj.real[i] / denominator;
            wImag[i] = hConj.imag[i] / denominator;
        }
    }
    return { real: wReal, imag: wImag };
}
