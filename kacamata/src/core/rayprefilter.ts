/**
 * Ray-Bundle Prefilter: Software analog of light field display per-ray manipulation
 * Based on "Light field displays with computational vision correction" (Qiu et al., 2023)
 * 
 * Core idea: Split pupil into K angular bundles, each with:
 * - Subpixel offset δ = (δx, δy) mimicking ray angle adjustment
 * - Anisotropic micro-sharpen kernel simulating local refocus
 * - Stiles-Crawford weight for physiological accuracy
 */

import { PSFParams, Kernel } from '../types';
import { generatePupilSamples, computeWavefrontGradient, angularToPixelOffset } from './phys';
import { PSFEngine } from './psf-engine';

/**
 * Ray bundle: represents one directional sampling component
 */
export interface RayBundle {
  dx: number;        // Subpixel x offset (pixels)
  dy: number;        // Subpixel y offset (pixels)
  kx: number;        // Anisotropic sharpen strength x-axis (0.6..1.6)
  ky: number;        // Anisotropic sharpen strength y-axis (0.6..1.6)
  theta: number;     // Orientation angle (degrees)
  weight: number;    // Stiles-Crawford weight (normalized)
}

/**
 * Ray LUT: lookup table for fast ray-bundle processing
 */
export interface RayLUT {
  bundles: RayBundle[];
  num_bundles: number;
  pupil_mm: number;
  deltaD: number;    // Excess defocus used to build this LUT
}

/**
 * Build ray-bundle LUT from prescription and viewing parameters
 */
export function buildRayLUT(
  params: PSFParams,
  num_bundles: number = 6,
  k_ang: number = 1.5  // px/rad scaling for angular → pixel offset
): RayLUT {
  const { sphere_D, cylinder_D, axis_deg, distance_cm, display_ppi, ambient_light } = params;
  
  // Check if no correction needed
  if (PSFEngine.isNoRx(sphere_D, cylinder_D)) {
    return {
      bundles: [{ dx: 0, dy: 0, kx: 1.0, ky: 1.0, theta: 0, weight: 1.0 }],
      num_bundles: 1,
      pupil_mm: 3.0,
      deltaD: 0,
    };
  }
  
  // Compute excess defocus
  const deltaD = PSFEngine.computeExcessDefocus(sphere_D, distance_cm);
  if (deltaD < 0.01) {
    return {
      bundles: [{ dx: 0, dy: 0, kx: 1.0, ky: 1.0, theta: 0, weight: 1.0 }],
      num_bundles: 1,
      pupil_mm: 3.0,
      deltaD: 0,
    };
  }
  
  // Estimate pupil size from ambient light
  const pupil_mm = ambient_light !== undefined && ambient_light !== null
    ? 4.0 - (ambient_light / 255) * 2.0  // 4mm dark → 2mm bright
    : 3.0;
  const pupil_radius_mm = Math.max(1.5, Math.min(3.0, pupil_mm / 2));
  
  // Generate pupil sample points with SCE weights
  const pupil_samples = generatePupilSamples(pupil_radius_mm, num_bundles);
  
  // Build bundles from pupil samples
  const bundles: RayBundle[] = [];
  const cyl = cylinder_D || 0;
  const axis = axis_deg || 0;
  
  for (const sample of pupil_samples) {
    // Compute wavefront gradient at this pupil location
    const grad = computeWavefrontGradient(
      sample.x,
      sample.y,
      pupil_radius_mm,
      sphere_D,
      Math.abs(cyl),
      axis
    );
    
    // Convert gradient to angular deviation (simplified)
    // ∂W/∂x → Δθ_x (small angle approximation)
    const angular_dev_x = grad.dx * 0.001; // Scale factor (radians)
    const angular_dev_y = grad.dy * 0.001;
    
    // Convert to pixel offset
    const dx = angularToPixelOffset(angular_dev_x, distance_cm, display_ppi) * k_ang;
    const dy = angularToPixelOffset(angular_dev_y, distance_cm, display_ppi) * k_ang;
    
    // Clamp offsets to reasonable range
    const dx_clamped = Math.max(-0.6, Math.min(0.6, dx));
    const dy_clamped = Math.max(-0.6, Math.min(0.6, dy));
    
    // Compute anisotropic sharpen factors from cylinder
    const astig_factor = Math.min(1.0, Math.abs(cyl) / 2.0);
    let kx = 1.0;
    let ky = 1.0;
    let theta = sample.theta;
    
    if (astig_factor > 0.1) {
      // Directional sharpening aligned to astigmatism axis
      kx = 1.0 + astig_factor * 0.4;
      ky = 1.0 - astig_factor * 0.3;
      theta = axis;
    }
    
    // Clamp k values
    kx = Math.max(0.6, Math.min(1.6, kx));
    ky = Math.max(0.6, Math.min(1.6, ky));
    
    bundles.push({
      dx: dx_clamped,
      dy: dy_clamped,
      kx,
      ky,
      theta,
      weight: sample.weight,
    });
  }
  
  return {
    bundles,
    num_bundles: bundles.length,
    pupil_mm: pupil_mm,
    deltaD,
  };
}

/**
 * Apply ray-bundle prefilter to frame
 * 
 * Algorithm:
 * 1. For each bundle, sample frame with subpixel offset
 * 2. Apply anisotropic micro-sharpen
 * 3. Blend with SCE weight
 */
export function applyRayPrefilter(
  input: Uint8Array,
  width: number,
  height: number,
  lut: RayLUT
): Uint8Array {
  const output = new Uint8Array(input.length);
  
  // Identity passthrough for single bundle with no offset
  if (lut.num_bundles === 1 && Math.abs(lut.bundles[0].dx) < 0.01 && Math.abs(lut.bundles[0].dy) < 0.01) {
    output.set(input);
    return output;
  }
  
  // Accumulation buffers (float for precision)
  const acc_r = new Float32Array(width * height);
  const acc_g = new Float32Array(width * height);
  const acc_b = new Float32Array(width * height);
  const acc_a = new Float32Array(width * height);
  
  // Process each bundle
  for (const bundle of lut.bundles) {
    // Sample with bilinear interpolation + subpixel offset
    const sampled = sampleBilinear(input, width, height, bundle.dx, bundle.dy);
    
    // Apply anisotropic micro-sharpen
    const sharpened = anisotropicSharpen(sampled, width, height, bundle.kx, bundle.ky, bundle.theta);
    
    // Accumulate with weight
    const w = bundle.weight;
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      acc_r[i] += sharpened[idx] * w;
      acc_g[i] += sharpened[idx + 1] * w;
      acc_b[i] += sharpened[idx + 2] * w;
      acc_a[i] += sharpened[idx + 3] * w;
    }
  }
  
  // Convert back to uint8
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    output[idx] = Math.min(255, Math.max(0, Math.round(acc_r[i])));
    output[idx + 1] = Math.min(255, Math.max(0, Math.round(acc_g[i])));
    output[idx + 2] = Math.min(255, Math.max(0, Math.round(acc_b[i])));
    output[idx + 3] = Math.min(255, Math.max(0, Math.round(acc_a[i])));
  }
  
  return output;
}

/**
 * Bilinear sampling with subpixel offset
 */
function sampleBilinear(
  input: Uint8Array,
  width: number,
  height: number,
  dx: number,
  dy: number
): Uint8Array {
  const output = new Uint8Array(input.length);
  
  // No offset → direct copy
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    output.set(input);
    return output;
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Source coordinates with offset
      const src_x = x - dx;
      const src_y = y - dy;
      
      // Integer and fractional parts
      const x0 = Math.floor(src_x);
      const y0 = Math.floor(src_y);
      const fx = src_x - x0;
      const fy = src_y - y0;
      
      // Clamp to bounds
      const x0_clamped = Math.max(0, Math.min(width - 1, x0));
      const x1_clamped = Math.max(0, Math.min(width - 1, x0 + 1));
      const y0_clamped = Math.max(0, Math.min(height - 1, y0));
      const y1_clamped = Math.max(0, Math.min(height - 1, y0 + 1));
      
      // Bilinear weights
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      
      // Sample four neighbors
      const idx00 = (y0_clamped * width + x0_clamped) * 4;
      const idx10 = (y0_clamped * width + x1_clamped) * 4;
      const idx01 = (y1_clamped * width + x0_clamped) * 4;
      const idx11 = (y1_clamped * width + x1_clamped) * 4;
      
      const out_idx = (y * width + x) * 4;
      
      // Interpolate each channel
      for (let c = 0; c < 4; c++) {
        const val = 
          input[idx00 + c] * w00 +
          input[idx10 + c] * w10 +
          input[idx01 + c] * w01 +
          input[idx11 + c] * w11;
        output[out_idx + c] = Math.min(255, Math.max(0, Math.round(val)));
      }
    }
  }
  
  return output;
}

/**
 * Anisotropic micro-sharpen using oriented unsharp mask
 * S = I + α * (I - G_σ(θ)(I))
 * where G_σ(θ) is oriented Gaussian blur
 */
function anisotropicSharpen(
  input: Uint8Array,
  width: number,
  height: number,
  kx: number,
  ky: number,
  theta_deg: number
): Uint8Array {
  const alpha = 0.3; // Sharpen strength (conservative)
  
  // No sharpening if k values are ~1.0
  if (Math.abs(kx - 1.0) < 0.05 && Math.abs(ky - 1.0) < 0.05) {
    const output = new Uint8Array(input.length);
    output.set(input);
    return output;
  }
  
  // Compute oriented Gaussian blur
  const sigma_x = 0.8 / kx; // Higher k → less blur → more sharp
  const sigma_y = 0.8 / ky;
  const blurred = gaussianBlur(input, width, height, sigma_x, sigma_y, theta_deg);
  
  // Unsharp mask: I + α * (I - blur)
  const output = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const diff = input[i] - blurred[i];
    const sharpened = input[i] + alpha * diff;
    output[i] = Math.min(255, Math.max(0, Math.round(sharpened)));
  }
  
  return output;
}

/**
 * Oriented Gaussian blur (simplified separable approximation)
 */
function gaussianBlur(
  input: Uint8Array,
  width: number,
  height: number,
  sigma_x: number,
  sigma_y: number,
  theta_deg: number
): Uint8Array {
  // For simplicity, use box blur approximation (fast)
  // Full implementation would rotate, blur, rotate back
  const radius = Math.ceil(Math.max(sigma_x, sigma_y) * 1.5);
  const output = new Uint8Array(input.length);
  
  // Horizontal pass
  const temp = new Uint8Array(input.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.max(0, Math.min(width - 1, x + dx));
        const idx = (y * width + nx) * 4;
        r += input[idx];
        g += input[idx + 1];
        b += input[idx + 2];
        a += input[idx + 3];
        count++;
      }
      
      const out_idx = (y * width + x) * 4;
      temp[out_idx] = r / count;
      temp[out_idx + 1] = g / count;
      temp[out_idx + 2] = b / count;
      temp[out_idx + 3] = a / count;
    }
  }
  
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.max(0, Math.min(height - 1, y + dy));
        const idx = (ny * width + x) * 4;
        r += temp[idx];
        g += temp[idx + 1];
        b += temp[idx + 2];
        a += temp[idx + 3];
        count++;
      }
      
      const out_idx = (y * width + x) * 4;
      output[out_idx] = r / count;
      output[out_idx + 1] = g / count;
      output[out_idx + 2] = b / count;
      output[out_idx + 3] = a / count;
    }
  }
  
  return output;
}


