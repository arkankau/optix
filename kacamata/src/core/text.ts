/**
 * Subpixel Text Rendering Helpers
 * 
 * Implements RGB-stripe subpixel rendering (ClearType-style) to increase
 * effective horizontal resolution for text clarity under blur.
 */

/**
 * Subpixel rendering configuration
 */
export interface SubpixelConfig {
  stripeOrder: 'RGB' | 'BGR';  // Subpixel order (most displays are RGB)
  strokeLift: number;          // Font-weight synthesis amount (0-0.35px)
  gammaLinear: boolean;        // Render in linear color space
  fringeLimit: number;         // Max color fringing as fraction of luminance (0.03 = 3%)
  enabled: boolean;            // Master enable/disable
  weightLiftPx?: number;       // Additional weight lift for Nearify mode
}

/**
 * Default subpixel configuration
 */
export const DEFAULT_SUBPIXEL_CONFIG: SubpixelConfig = {
  stripeOrder: 'RGB',
  strokeLift: 0.2,
  gammaLinear: true,
  fringeLimit: 0.03,
  enabled: false, // Disabled by default, enable when ΔD > 0
};

/**
 * Subpixel sample offsets for RGB stripe
 * Shifts each color channel by 1/3 pixel horizontally
 */
export function getSubpixelOffsets(stripeOrder: 'RGB' | 'BGR'): {
  r: number;
  g: number;
  b: number;
} {
  if (stripeOrder === 'RGB') {
    return {
      r: -1/3,  // Red shifted left
      g: 0,     // Green centered
      b: 1/3,   // Blue shifted right
    };
  } else {
    return {
      r: 1/3,   // Red shifted right
      g: 0,     // Green centered
      b: -1/3,  // Blue shifted left
    };
  }
}

/**
 * Apply subpixel rendering to glyph coverage
 * 
 * @param coverage Grayscale coverage map (0-1)
 * @param x X position
 * @param y Y position
 * @param color RGB color (0-255)
 * @param config Subpixel configuration
 * @returns RGB values with subpixel positioning
 */
export function applySubpixelCoverage(
  coverage: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  color: [number, number, number],
  config: SubpixelConfig
): [number, number, number] {
  if (!config.enabled) {
    // No subpixel rendering, use same coverage for all channels
    const c = sampleCoverage(coverage, width, height, x, y);
    return [
      Math.round(color[0] * c),
      Math.round(color[1] * c),
      Math.round(color[2] * c),
    ];
  }
  
  const offsets = getSubpixelOffsets(config.stripeOrder);
  
  // Sample each channel at shifted position
  const cR = sampleCoverage(coverage, width, height, x + offsets.r, y);
  const cG = sampleCoverage(coverage, width, height, x + offsets.g, y);
  const cB = sampleCoverage(coverage, width, height, x + offsets.b, y);
  
  // Apply stroke lift (font-weight synthesis) if enabled
  let r = cR, g = cG, b = cB;
  const totalLift = config.strokeLift + (config.weightLiftPx || 0);
  if (totalLift > 0) {
    r = Math.min(1, r + totalLift * (1 - r));
    g = Math.min(1, g + totalLift * (1 - g));
    b = Math.min(1, b + totalLift * (1 - b));
  }
  
  // Compute luminance for fringe limiting
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  
  // Limit color fringing to prevent excessive chromatic aberration
  const maxDelta = luma * config.fringeLimit;
  r = Math.max(luma - maxDelta, Math.min(luma + maxDelta, r));
  g = Math.max(luma - maxDelta, Math.min(luma + maxDelta, g));
  b = Math.max(luma - maxDelta, Math.min(luma + maxDelta, b));
  
  // Convert to linear if needed
  if (config.gammaLinear) {
    r = srgbToLinear(r);
    g = srgbToLinear(g);
    b = srgbToLinear(b);
  }
  
  return [
    Math.round(color[0] * r),
    Math.round(color[1] * g),
    Math.round(color[2] * b),
  ];
}

/**
 * Sample coverage map with bilinear interpolation
 */
function sampleCoverage(
  coverage: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  // Clamp to bounds
  x = Math.max(0, Math.min(width - 1, x));
  y = Math.max(0, Math.min(height - 1, y));
  
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  
  const fx = x - x0;
  const fy = y - y0;
  
  const c00 = coverage[y0 * width + x0] || 0;
  const c10 = coverage[y0 * width + x1] || 0;
  const c01 = coverage[y1 * width + x0] || 0;
  const c11 = coverage[y1 * width + x1] || 0;
  
  const c0 = c00 * (1 - fx) + c10 * fx;
  const c1 = c01 * (1 - fx) + c11 * fx;
  
  return c0 * (1 - fy) + c1 * fy;
}

/**
 * sRGB to linear conversion
 */
function srgbToLinear(c: number): number {
  if (c <= 0.04045) {
    return c / 12.92;
  } else {
    return Math.pow((c + 0.055) / 1.055, 2.4);
  }
}

/**
 * Linear to sRGB conversion
 */
export function linearToSrgb(c: number): number {
  if (c <= 0.0031308) {
    return c * 12.92;
  } else {
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }
}

/**
 * Apply subpixel rendering to entire RGBA image
 * Processes text regions only (assumes background is pre-composited)
 */
export function applySubpixelToImage(
  input: Uint8Array,
  width: number,
  height: number,
  config: SubpixelConfig
): Uint8Array {
  if (!config.enabled) {
    const output = new Uint8Array(input.length);
    output.set(input);
    return output;
  }
  
  const output = new Uint8Array(input.length);
  const offsets = getSubpixelOffsets(config.stripeOrder);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Sample each channel at offset position
      const rIdx = getPixelIndex(width, height, x + offsets.r, y);
      const gIdx = getPixelIndex(width, height, x + offsets.g, y);
      const bIdx = getPixelIndex(width, height, x + offsets.b, y);
      
      output[idx] = input[rIdx];
      output[idx + 1] = input[gIdx + 1];
      output[idx + 2] = input[bIdx + 2];
      output[idx + 3] = input[idx + 3]; // Alpha unchanged
    }
  }
  
  return output;
}

/**
 * Get pixel index with bilinear sampling
 */
function getPixelIndex(width: number, height: number, x: number, y: number): number {
  x = Math.max(0, Math.min(width - 1, Math.round(x)));
  y = Math.max(0, Math.min(height - 1, Math.round(y)));
  return (y * width + x) * 4;
}

/**
 * Create subpixel config from blur parameters
 */
export function createSubpixelConfig(deltaD: number, enabled: boolean = true): SubpixelConfig {
  return {
    ...DEFAULT_SUBPIXEL_CONFIG,
    strokeLift: Math.min(0.35, 0.1 + deltaD * 0.15),
    enabled: enabled && deltaD > 0.1,
  };
}

/**
 * Create subpixel config for Nearify mode
 * Optimized for large, clear text with optional weight lift
 */
export function createNearifySubpixelConfig(
  weightLiftPx: number = 0,
  enabled: boolean = true
): SubpixelConfig {
  return {
    stripeOrder: 'RGB',
    strokeLift: 0, // Base stroke lift off in Nearify
    gammaLinear: true,
    fringeLimit: 0.03, // Strict 3% limit
    enabled,
    weightLiftPx, // Use dedicated weight lift for thin fonts
  };
}

/**
 * Subpixel text metrics adjustment
 * Returns adjusted font metrics for better rendering
 */
export interface AdjustedTextMetrics {
  fontSizePx: number;
  fontWeight: number;  // 100-900
  letterSpacing: number; // em units
  lineHeight: number;    // multiplier
}

export function adjustTextMetrics(
  baseFontPx: number,
  deltaD: number,
  config: SubpixelConfig
): AdjustedTextMetrics {
  // Increase font weight slightly to compensate for blur
  const weightBoost = config.enabled && config.strokeLift > 0 ? 100 : 0;
  
  // Increase letter spacing slightly to improve separation
  const spacingBoost = deltaD > 0.5 ? 0.01 + (deltaD - 0.5) * 0.02 : 0;
  
  // Increase line height for better readability
  const lineHeightBoost = deltaD > 0.8 ? 0.1 + (deltaD - 0.8) * 0.1 : 0;
  
  return {
    fontSizePx: baseFontPx,
    fontWeight: Math.min(700, 400 + weightBoost),
    letterSpacing: Math.min(0.05, spacingBoost),
    lineHeight: Math.min(1.8, 1.4 + lineHeightBoost),
  };
}

