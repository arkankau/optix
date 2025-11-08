/**
 * Physical optics module: pupil helpers, Zernike polynomials, and physiological models
 * Based on human eye optics and Stiles-Crawford effect
 */

/**
 * Constants for human eye optics
 */
export const EYE_FOCAL_LENGTH_M = 0.017; // ~17mm
export const EYE_FOCAL_LENGTH_MM = 17.0;

/**
 * Pupil size estimation from ambient light level
 * Darker environment → larger pupil (more blur from aberrations)
 */
export function pupilSizeFromAmbient(ambient_light_0_255: number): number {
  // Empirical model: 4mm (dark) to 2mm (bright)
  // Reference: Watson & Yellott (2012)
  const normalized = Math.max(0, Math.min(1, ambient_light_0_255 / 255));
  const pupil_mm = 4.0 - normalized * 2.0;
  return Math.max(2.0, Math.min(6.0, pupil_mm));
}

/**
 * Stiles-Crawford Effect (SCE-I): Directional sensitivity of photoreceptors
 * Light entering near pupil edge is less effective
 * Model: η(r) = 10^(-ρ * r²), where r is radial distance from pupil center in mm
 * 
 * Reference: Stiles & Crawford (1933), ρ ≈ 0.05 mm^-2 for photopic vision
 */
export function stilesCrawford(radius_mm: number, rho: number = 0.05): number {
  return Math.pow(10, -rho * radius_mm * radius_mm);
}

/**
 * Generate pupil sample points for ray-bundle analysis
 * Returns array of {x, y, r, theta, weight} where:
 *   - x, y: position in mm from center
 *   - r: radial distance in mm
 *   - theta: angle in degrees
 *   - weight: SCE weight (normalized so sum = 1)
 */
export interface PupilSample {
  x: number;
  y: number;
  r: number;
  theta: number;
  weight: number;
}

export function generatePupilSamples(
  pupil_radius_mm: number,
  num_samples: number = 6
): PupilSample[] {
  const samples: PupilSample[] = [];
  
  if (num_samples === 1) {
    // Single central sample
    samples.push({ x: 0, y: 0, r: 0, theta: 0, weight: 1.0 });
    return samples;
  }

  // Strategy: concentric rings
  // For K=6: 1 center + 5 on circle at 0.7*radius
  // For K=8: 1 center + 7 on circle
  const center_weight = stilesCrawford(0);
  samples.push({ x: 0, y: 0, r: 0, theta: 0, weight: center_weight });

  const ring_radius = 0.7 * pupil_radius_mm;
  const num_ring = num_samples - 1;
  
  for (let i = 0; i < num_ring; i++) {
    const theta_deg = (360 * i) / num_ring;
    const theta_rad = (theta_deg * Math.PI) / 180;
    const x = ring_radius * Math.cos(theta_rad);
    const y = ring_radius * Math.sin(theta_rad);
    const weight = stilesCrawford(ring_radius);
    
    samples.push({ x, y, r: ring_radius, theta: theta_deg, weight });
  }

  // Normalize weights to sum to 1
  const total_weight = samples.reduce((sum, s) => sum + s.weight, 0);
  samples.forEach(s => s.weight /= total_weight);

  return samples;
}

/**
 * Zernike polynomial helpers (subset for defocus + astigmatism)
 * Using OSA/ANSI standard indexing
 */

/**
 * Zernike Z2^0: Defocus
 * W_defocus(ρ) = √3 * (2ρ² - 1)
 * Maps to sphere diopter: D_sphere ≈ -4√3 * a_20 / R² (R = pupil radius)
 */
export function zernikeDefocus(rho: number): number {
  return Math.sqrt(3) * (2 * rho * rho - 1);
}

/**
 * Zernike Z2^-2: Astigmatism at 0° or 90°
 * W_astig0(ρ,θ) = √6 * ρ² * cos(2θ)
 */
export function zernikeAstig0(rho: number, theta_rad: number): number {
  return Math.sqrt(6) * rho * rho * Math.cos(2 * theta_rad);
}

/**
 * Zernike Z2^+2: Astigmatism at 45°
 * W_astig45(ρ,θ) = √6 * ρ² * sin(2θ)
 */
export function zernikeAstig45(rho: number, theta_rad: number): number {
  return Math.sqrt(6) * rho * rho * Math.sin(2 * theta_rad);
}

/**
 * Compute wavefront gradient (slope) at pupil location
 * Returns {dx, dy} in diopters/mm
 */
export interface WavefrontGradient {
  dx: number; // dW/dx
  dy: number; // dW/dy
}

export function computeWavefrontGradient(
  pupil_x_mm: number,
  pupil_y_mm: number,
  pupil_radius_mm: number,
  defocus_D: number,
  astig_magnitude_D: number,
  astig_axis_deg: number
): WavefrontGradient {
  // Normalize to unit pupil
  const rho = Math.sqrt(pupil_x_mm * pupil_x_mm + pupil_y_mm * pupil_y_mm) / pupil_radius_mm;
  const theta_rad = Math.atan2(pupil_y_mm, pupil_x_mm);

  // Defocus gradient: ∂W/∂x ∝ x, ∂W/∂y ∝ y
  // Simplified linear model for small angles
  const defocus_scale = defocus_D / (pupil_radius_mm * pupil_radius_mm);
  let dx = 2 * defocus_scale * pupil_x_mm;
  let dy = 2 * defocus_scale * pupil_y_mm;

  // Astigmatism gradient: depends on axis orientation
  if (astig_magnitude_D > 0.1) {
    const axis_rad = (astig_axis_deg * Math.PI) / 180;
    const astig_scale = astig_magnitude_D / (pupil_radius_mm * pupil_radius_mm);
    
    // Rotate coordinates to astigmatism axis
    const cos_a = Math.cos(axis_rad);
    const sin_a = Math.sin(axis_rad);
    const x_rot = pupil_x_mm * cos_a + pupil_y_mm * sin_a;
    const y_rot = -pupil_x_mm * sin_a + pupil_y_mm * cos_a;
    
    // Add astigmatic component (elliptical)
    const dx_astig = 2 * astig_scale * x_rot * (1 + 0.5);
    const dy_astig = 2 * astig_scale * y_rot * (1 - 0.5);
    
    // Rotate back
    dx += dx_astig * cos_a - dy_astig * sin_a;
    dy += dx_astig * sin_a + dy_astig * cos_a;
  }

  return { dx, dy };
}

/**
 * Convert angular deviation (from wavefront slope) to pixel offset
 * Based on distance to screen and pixel size
 */
export function angularToPixelOffset(
  angular_deviation_rad: number,
  distance_cm: number,
  ppi: number
): number {
  const distance_m = distance_cm / 100;
  const pixel_size_m = 0.0254 / ppi;
  const offset_m = angular_deviation_rad * distance_m;
  return offset_m / pixel_size_m;
}

