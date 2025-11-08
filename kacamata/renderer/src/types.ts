// Re-export types for renderer
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

