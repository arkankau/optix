# Implementation Changes - Wiener Filter Fix

## Summary

Fixed the implementation to correctly follow the research paper "Software Based Visual Aberration Correction for HMDs" by implementing proper Wiener deconvolution in the frequency domain.

## Files Changed

### 1. `src/core/fft-utils.ts` (NEW)
- Added FFT utility functions for frequency-domain processing
- Implemented simple 1D DFT for small kernels (15-31 pixels)
- Added 2D FFT using row-column decomposition
- Implemented Wiener filter computation: `W(f) = H*(f) / (|H(f)|² + λ)`
- Functions:
  - `compute1DFFT()` - 1D FFT using DFT for small kernels
  - `compute1DIFFT()` - 1D IFFT
  - `compute2DFFT()` - 2D FFT using row-column method
  - `computeWienerFilter1D()` - Wiener filter for 1D kernels
  - `complexConjugate()` - Complex conjugate helper
  - `magnitudeSquared()` - Magnitude squared helper

### 2. `src/core/psf-engine.ts` (UPDATED)
- **Fixed `computeWienerFilter()` method**:
  - Previously: Placeholder returning 1.0 everywhere
  - Now: Properly computes Wiener filter in frequency domain
  - Pads PSF kernel to image dimensions
  - Computes 2D FFT of PSF
  - Applies Wiener filter formula: `W(f) = H*(f) / (|H(f)|² + λ)`
  - Returns correct frequency-domain filter

### 3. `src/core/wiener-engine.ts` (UPDATED)
- **Fixed `generateSeparableInverse()` method**:
  - Previously: Used incorrect approximation `(1 - blur) / (1 + lambda * 10)`
  - Now: Proper Wiener filter implementation
  - Generates 1D Gaussian kernels
  - Computes 1D FFT of each kernel
  - Applies Wiener filter formula in frequency domain
  - Converts back to spatial domain via IFFT
  - Handles edge cases (unstable filters)

## Key Changes

### Before (Incorrect)
```typescript
// Wrong approximation
const inv_h = (1.0 - horiz[i]) / (1.0 + lambda * 10);
```

### After (Correct)
```typescript
// Compute 1D FFT of Gaussian kernel
const h_horiz_fft = compute1DFFT(h_horiz);

// Compute Wiener filter: W(f) = H*(f) / (|H(f)|² + λ)
const w_horiz_fft = computeWienerFilter1D(h_horiz_fft.real, h_horiz_fft.imag, lambda);

// Convert back to spatial domain
const w_horiz_spatial = compute1DIFFT(w_horiz_fft.real, w_horiz_fft.imag);
```

## Technical Details

### Wiener Filter Formula
The correct Wiener filter formula from the research paper:
```
W(f) = H*(f) / (|H(f)|² + λ)
```

Where:
- `H(f)` = Frequency response of PSF (blur kernel)
- `H*(f)` = Complex conjugate of H(f)
- `|H(f)|²` = Magnitude squared = H*(f) · H(f)
- `λ` = Regularization parameter (prevents division by zero, controls noise)

### Implementation Approach

1. **For Separable Kernels** (fast path):
   - Generate 1D Gaussian kernels (horizontal and vertical)
   - Compute 1D FFT of each kernel
   - Apply Wiener filter formula in frequency domain
   - Convert back to spatial domain via IFFT
   - Use separable convolution for fast processing

2. **For Non-Separable Kernels**:
   - Generate 2D PSF kernel
   - Compute 2D FFT of kernel
   - Apply Wiener filter formula
   - (Can be used for frequency-domain filtering, currently uses unsharp masking fallback)

## Performance Considerations

- **Small Kernels (15-31 pixels)**: Uses simple DFT (O(N²)), fast for small N
- **Larger Images**: 2D FFT uses row-column decomposition
- **Future Optimization**: Can integrate GPU FFT libraries (VkFFT, MPS) for real-time processing

## Testing

The implementation now:
1. ✅ Correctly computes Wiener filter in frequency domain
2. ✅ Uses proper formula: `W(f) = H*(f) / (|H(f)|² + λ)`
3. ✅ Handles separable kernels efficiently
4. ✅ Builds without errors
5. ✅ Matches research paper methodology

## Next Steps (Future Improvements)

1. **GPU Acceleration**: 
   - Implement WebGPU compute shaders for FFT
   - Use VkFFT or similar for hardware-accelerated FFT
   - Process full frames at 60+ FPS

2. **Energy Function Optimization**:
   - Define energy function: `E = ||I_ideal - (I_precorrected * PSF)||²`
   - Show that Wiener filter minimizes this energy
   - Allow adaptive λ tuning based on image content

3. **Optimized 2D FFT**:
   - Use optimized FFT library for large images
   - Implement tiled FFT for memory efficiency
   - Add GPU-accelerated path

## References

- Research Paper: "Software Based Visual Aberration Correction for HMDs" by Feng Xu et al.
- Wiener Filter: Standard image deconvolution technique
- FFT: Fast Fourier Transform for frequency-domain processing

