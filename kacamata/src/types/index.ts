export interface Rx {
  sphere_D: number;
  cylinder_D: number | null;
  axis_deg: number | null;
}

export interface Display {
  width_px: number;
  height_px: number;
  diag_in: number;
}

export interface Kernel {
  sigma_x: number;
  sigma_y: number;
  theta_deg: number;
  size: number;
  separable?: boolean;
  inv_horiz?: Float32Array;
  inv_vert?: Float32Array;
  is_identity?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  rx: Rx;
  display: Display;
  ppi: number;
  distance_cm_nominal: number;
  ambient_light_level: number | null;
  kernel: Kernel;
  wiener_lambda: number;
  created_at: number;
  updated_at: number;
}

export interface Telemetry {
  timestamp: number;
  distance_cm: number;
  fps: number;
  latency_ms: number;
  lambda: number;
  user_feedback: 'too_blurry' | 'too_sharp' | 'ok' | null;
}

export interface PSFParams {
  sphere_D: number;
  cylinder_D?: number;
  axis_deg?: number;
  distance_cm: number;
  display_ppi: number;
  ambient_light?: number;
  display_width_px?: number;
  display_height_px?: number;
  display_diag_in?: number;
}

export interface ProcessFrameParams {
  textureHandle?: any;
  buffer?: ArrayBuffer;
  width: number;
  height: number;
  psfParams: PSFParams;
  lambda: number;
  lfd_inspired?: boolean;
  contrast_boost?: number;
}

export interface WavefrontApprox {
  defocus: number; // diopters
  astig_magnitude: number; // diopters
  astig_angle: number; // degrees
  pupil_radius_mm: number;
}

export interface VoxelRay {
  offset_x: number;
  offset_y: number;
  weight_r: number;
  weight_g: number;
  weight_b: number;
}

export interface VoxelLUT {
  voxel_size: number; // pixels per voxel (e.g., 3-4)
  rays_per_voxel: number; // 4-8
  width_voxels: number;
  height_voxels: number;
  rays: VoxelRay[][]; // [voxel_index] -> [ray_index]
}

export interface VisionModels {
  psf: Kernel;
  wavefront?: WavefrontApprox;
  lut?: VoxelLUT;
  last_updated: number;
}
