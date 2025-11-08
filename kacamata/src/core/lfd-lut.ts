import { WavefrontApprox, VoxelLUT, VoxelRay, PSFParams } from '../types';

/**
 * LFD-Inspired LUT Engine: Builds voxel ray LUT for software-only ray redistribution
 * Based on Qiu et al., Optics Express 31(4):6262–6280 (2023)
 * Approximates light-field ray steering via sample redistribution
 */
export class LFDLUTEngine {
  /**
   * Build voxel LUT from wavefront approximation
   */
  static buildLUT(
    wavefront: WavefrontApprox,
    params: PSFParams & { display_width_px?: number; display_height_px?: number; display_diag_in?: number },
    voxelSize: number = 4,
    raysPerVoxel: number = 6
  ): VoxelLUT {
    const width_px = params.display_width_px || 1920;
    const height_px = params.display_height_px || 1080;
    const diag_in = params.display_diag_in || 24;
    const ppi_val = params.display_ppi || Math.sqrt(width_px ** 2 + height_px ** 2) / diag_in;

    const width_voxels = Math.floor(width_px / voxelSize);
    const height_voxels = Math.floor(height_px / voxelSize);

    // Initialize LUT
    const rays: VoxelRay[][] = [];
    const totalVoxels = width_voxels * height_voxels;

    for (let v = 0; v < totalVoxels; v++) {
      rays[v] = [];
    }

    // Compute inverse-shear offsets based on wavefront
    const defocus_offset = this.computeDefocusOffset(wavefront.defocus, params.distance_cm, ppi_val);
    const astig_shear = this.computeAstigShear(
      wavefront.astig_magnitude,
      wavefront.astig_angle,
      params.distance_cm,
      ppi_val
    );

    // Build LUT for each voxel
    for (let vy = 0; vy < height_voxels; vy++) {
      for (let vx = 0; vx < width_voxels; vx++) {
        const voxel_idx = vy * width_voxels + vx;
        const voxel_x = vx * voxelSize + voxelSize / 2;
        const voxel_y = vy * voxelSize + voxelSize / 2;

        // Generate ray samples with offsets that counteract blur
        const voxelRays: VoxelRay[] = [];
        for (let r = 0; r < raysPerVoxel; r++) {
          // Jittered sampling pattern
          const angle = (r / raysPerVoxel) * Math.PI * 2;
          const radius = (r % 2 === 0 ? 0.5 : 1.0) * voxelSize * 0.3;

          // Base offset
          let offset_x = Math.cos(angle) * radius;
          let offset_y = Math.sin(angle) * radius;

          // Apply inverse defocus correction (pull samples inward)
          offset_x -= defocus_offset * Math.cos(angle);
          offset_y -= defocus_offset * Math.sin(angle);

          // Apply inverse astigmatism shear
          const astig_rad = (wavefront.astig_angle * Math.PI) / 180;
          const cos_a = Math.cos(astig_rad);
          const sin_a = Math.sin(astig_rad);
          const shear_x = offset_x * cos_a - offset_y * sin_a;
          const shear_y = offset_x * sin_a + offset_y * cos_a;
          offset_x = shear_x - astig_shear.x * shear_x;
          offset_y = shear_y - astig_shear.y * shear_y;

          // Clamp offsets
          offset_x = Math.max(-voxelSize, Math.min(voxelSize, offset_x));
          offset_y = Math.max(-voxelSize, Math.min(voxelSize, offset_y));

          // Weights (can be per-channel for chromatic correction, but MVP uses uniform)
          const weight = 1.0 / raysPerVoxel;
          voxelRays.push({
            offset_x,
            offset_y,
            weight_r: weight,
            weight_g: weight,
            weight_b: weight,
          });
        }

        rays[voxel_idx] = voxelRays;
      }
    }

    return {
      voxel_size: voxelSize,
      rays_per_voxel: raysPerVoxel,
      width_voxels,
      height_voxels,
      rays,
    };
  }

  /**
   * Compute defocus correction offset (inverse of blur)
   */
  private static computeDefocusOffset(defocus_D: number, distance_cm: number, ppi: number): number {
    const defocus_abs = Math.abs(defocus_D);
    if (defocus_abs < 0.1) return 0;

    const distance_m = distance_cm / 100;
    const pixel_size_m = 0.0254 / ppi;

    // Inverse offset: pull samples toward center to counteract blur
    const offset_pixels = (defocus_abs * distance_m * ppi) / (4 * 0.0254);
    return Math.min(2.0, offset_pixels * 0.1); // Scale down for stability
  }

  /**
   * Compute astigmatism shear correction
   */
  private static computeAstigShear(
    astig_magnitude: number,
    astig_angle: number,
    distance_cm: number,
    ppi: number
  ): { x: number; y: number } {
    if (astig_magnitude < 0.1) return { x: 0, y: 0 };

    const distance_m = distance_cm / 100;
    const astig_rad = (astig_angle * Math.PI) / 180;

    // Inverse shear to counteract astigmatic blur
    const shear_magnitude = (astig_magnitude * distance_m * ppi) / (4 * 0.0254);
    const shear_scale = Math.min(0.3, shear_magnitude * 0.05);

    return {
      x: Math.cos(astig_rad) * shear_scale,
      y: Math.sin(astig_rad) * shear_scale,
    };
  }

  /**
   * Process frame using LFD-inspired LUT
   */
  static processFrame(
    input: Uint8Array,
    width: number,
    height: number,
    lut: VoxelLUT
  ): Uint8Array {
    if (!lut || lut.rays_per_voxel <= 0) {
      return input.slice();
    }

    const output = new Uint8Array(input.length);
    const { voxel_size, rays_per_voxel, width_voxels } = lut;

    // Process each voxel
    for (let vy = 0; vy < lut.height_voxels; vy++) {
      for (let vx = 0; vx < width_voxels; vx++) {
        const voxel_idx = vy * width_voxels + vx;
        const base_x = vx * voxel_size;
        const base_y = vy * voxel_size;

        // Accumulate rays for this voxel
        const acc_r = new Float32Array(voxel_size * voxel_size);
        const acc_g = new Float32Array(voxel_size * voxel_size);
        const acc_b = new Float32Array(voxel_size * voxel_size);
        const acc_w = new Float32Array(voxel_size * voxel_size);

        const voxelRays = lut.rays[voxel_idx];

        for (let ray of voxelRays) {
          for (let py = 0; py < voxel_size; py++) {
            for (let px = 0; px < voxel_size; px++) {
              const local_idx = py * voxel_size + px;
              const sample_x = base_x + px + ray.offset_x;
              const sample_y = base_y + py + ray.offset_y;

              // Bilinear sample
              const x0 = Math.floor(sample_x);
              const y0 = Math.floor(sample_y);
              const x1 = Math.min(width - 1, x0 + 1);
              const y1 = Math.min(height - 1, y0 + 1);

              const fx = sample_x - x0;
              const fy = sample_y - y0;

              if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
                const idx00 = (y0 * width + x0) * 4;
                const idx01 = (y0 * width + x1) * 4;
                const idx10 = (y1 * width + x0) * 4;
                const idx11 = (y1 * width + x1) * 4;

                const r = this.bilinearSample(
                  input[idx00],
                  input[idx01],
                  input[idx10],
                  input[idx11],
                  fx,
                  fy
                );
                const g = this.bilinearSample(
                  input[idx01 + 1],
                  input[idx01 + 1],
                  input[idx10 + 1],
                  input[idx11 + 1],
                  fx,
                  fy
                );
                const b = this.bilinearSample(
                  input[idx00 + 2],
                  input[idx01 + 2],
                  input[idx10 + 2],
                  input[idx11 + 2],
                  fx,
                  fy
                );

                const weight = ray.weight_r; // Use R weight (uniform in MVP)
                acc_r[local_idx] += r * weight;
                acc_g[local_idx] += g * weight;
                acc_b[local_idx] += b * weight;
                acc_w[local_idx] += weight;
              }
            }
          }
        }

        // Write accumulated result to output
        for (let py = 0; py < voxel_size; py++) {
          for (let px = 0; px < voxel_size; px++) {
            const local_idx = py * voxel_size + px;
            const out_x = base_x + px;
            const out_y = base_y + py;

            if (out_x < width && out_y < height) {
              const out_idx = (out_y * width + out_x) * 4;
              const w = acc_w[local_idx] || 1.0;

              output[out_idx] = Math.min(255, Math.max(0, acc_r[local_idx] / w));
              output[out_idx + 1] = Math.min(255, Math.max(0, acc_g[local_idx] / w));
              output[out_idx + 2] = Math.min(255, Math.max(0, acc_b[local_idx] / w));
              output[out_idx + 3] = input[out_idx + 3]; // Preserve alpha
            }
          }
        }
      }
    }

    // Post-process: micro-sharpen
    return this.microSharpen(output, width, height);
  }

  /**
   * Bilinear interpolation
   */
  private static bilinearSample(v00: number, v01: number, v10: number, v11: number, fx: number, fy: number): number {
    const v0 = v00 * (1 - fx) + v01 * fx;
    const v1 = v10 * (1 - fx) + v11 * fx;
    return v0 * (1 - fy) + v1 * fy;
  }

  /**
   * Micro-sharpen pass (light edge enhancement)
   */
  private static microSharpen(input: Uint8Array, width: number, height: number): Uint8Array {
    const output = new Uint8Array(input.length);
    const sharpenKernel = [-0.1, -0.1, -0.1, -0.1, 1.8, -0.1, -0.1, -0.1, -0.1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        let ki = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = sharpenKernel[ki++];
            r += input[idx] * weight;
            g += input[idx + 1] * weight;
            b += input[idx + 2] * weight;
          }
        }

        const out_idx = (y * width + x) * 4;
        output[out_idx] = Math.min(255, Math.max(0, r));
        output[out_idx + 1] = Math.min(255, Math.max(0, g));
        output[out_idx + 2] = Math.min(255, Math.max(0, b));
        output[out_idx + 3] = input[out_idx + 3];
      }
    }

    // Copy borders
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
          const idx = (y * width + x) * 4;
          output[idx] = input[idx];
          output[idx + 1] = input[idx + 1];
          output[idx + 2] = input[idx + 2];
          output[idx + 3] = input[idx + 3];
        }
      }
    }

    return output;
  }
}

