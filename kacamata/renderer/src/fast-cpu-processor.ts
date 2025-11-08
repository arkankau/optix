/**
 * Fast CPU-based image processing for real-time overlay
 * Simplified algorithms for better performance
 */

export class FastCPUProcessor {
  /**
   * Simple unsharp mask - much faster than full Wiener deconvolution
   */
  static unsharpMask(
    input: Uint8Array,
    width: number,
    height: number,
    strength: number = 1.5,
    radius: number = 2
  ): Uint8Array {
    const output = new Uint8Array(input.length);
    const blurred = this.boxBlur(input, width, height, radius);

    for (let i = 0; i < input.length; i += 4) {
      // RGB channels only
      for (let c = 0; c < 3; c++) {
        const orig = input[i + c];
        const blur = blurred[i + c];
        const sharp = orig + (orig - blur) * strength;
      output[i + 3] = input[i + 3];
    }

    return output;
  }

  /**
   * Fast box blur using horizontal + vertical passes
   */
  private static boxBlur(
    input: Uint8Array,
    width: number,
    height: number,
    radius: number
  ): Uint8Array {
    const temp = new Uint8Array(input.length);
    const output = new Uint8Array(input.length);
    const kernelSize = radius * 2 + 1;
    const divisor = kernelSize;

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const idx = (y * width + px) * 4;
          r += input[idx];
          g += input[idx + 1];
          b += input[idx + 2];
          a += input[idx + 3];
        }
        
        const outIdx = (y * width + x) * 4;
        temp[outIdx] = Math.round(r / divisor);
        temp[outIdx + 1] = Math.round(g / divisor);
        temp[outIdx + 2] = Math.round(b / divisor);
        temp[outIdx + 3] = Math.round(a / divisor);
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        
        for (let ky = -radius; ky <= radius; ky++) {
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + x) * 4;
          r += temp[idx];
          g += temp[idx + 1];
          b += temp[idx + 2];
          a += temp[idx + 3];
        }
        
        const outIdx = (y * width + x) * 4;
        output[outIdx] = Math.round(r / divisor);
        output[outIdx + 1] = Math.round(g / divisor);
        output[outIdx + 2] = Math.round(b / divisor);
        output[outIdx + 3] = Math.round(a / divisor);
      }
    }

    return output;
  }

  /**
   * Simple brightness/contrast adjustment
   */
  static adjustBrightnessContrast(
    input: Uint8Array,
    brightness: number = 0,
    contrast: number = 1.0
  ): Uint8Array {
    const output = new Uint8Array(input.length);
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < input.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let value = input[i + c];
        value = factor * (value - 128) + 128 + brightness;
        output[i + c] = Math.min(255, Math.max(0, Math.round(value)));
      }
      output[i + 3] = input[i + 3];
    }

    return output;
  }

  /**
   * Edge enhancement (high-pass filter)
   */
  static enhanceEdges(
    input: Uint8Array,
    width: number,
    height: number,
    strength: number = 1.0
  ): Uint8Array {
    const output = new Uint8Array(input.length);
    
    // Sobel-like kernel for edge detection
    const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let edgeX = 0, edgeY = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (input[idx] + input[idx + 1] + input[idx + 2]) / 3;
            const ki = (ky + 1) * 3 + (kx + 1);
            edgeX += gray * kernelX[ki];
            edgeY += gray * kernelY[ki];
          }
        }
        
        const edge = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
        const outIdx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          const orig = input[outIdx + c];
          const enhanced = orig + edge * strength;
          output[outIdx + c] = Math.min(255, Math.max(0, Math.round(enhanced)));
        }
        output[outIdx + 3] = input[outIdx + 3];
      }
    }

    return output;
  }

  /**
   * Combined fast sharpening (unsharp mask + edge enhancement)
   */
  static fastSharpen(
    input: Uint8Array,
    width: number,
    height: number,
    strength: number = 1.0
  ): Uint8Array {
    // Quick unsharp mask
    let result = this.unsharpMask(input, width, height, strength * 1.2, 2);
    
    // Optional: Add subtle edge enhancement for higher perceived sharpness
    // result = this.enhanceEdges(result, width, height, strength * 0.3);
    
    return result;
  }

  /**
   * Passthrough (no processing)
   */
  static passthrough(input: Uint8Array): Uint8Array {
    return input.slice();
  }
}
