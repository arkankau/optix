/**
 * Update HUD element with key-value data
 */
export function hudText(el: HTMLElement, data: Record<string, string | number>): void {
  el.innerHTML = Object.entries(data)
    .map(([k, v]) => `<div><b>${k}</b>: ${v}</div>`)
    .join('');
}

/**
 * Format a distance in meters to cm with units
 */
export function formatDistance(meters: number): string {
  return `${(meters * 100).toFixed(0)} cm`;
}

/**
 * Format diopters
 */
export function formatDiopters(d: number): string {
  return `${d.toFixed(2)} D`;
}

/**
 * Create a formatted HUD data object
 */
export function createHUDData(data: {
  rx: number;
  farPoint: number;
  zeroDisparity: number;
  clarityBand: string;
  stereo: string;
  depthRemap: string;
  fps?: number;
}): Record<string, string | number> {
  const result: Record<string, string | number> = {
    'Rx (sphere)': formatDiopters(data.rx),
    'Far point': formatDistance(data.farPoint),
    'Zero-disparity': formatDistance(data.zeroDisparity),
    'Clarity band': data.clarityBand,
    'Stereo': data.stereo,
    'Depth Remap': data.depthRemap,
  };
  
  if (data.fps !== undefined) {
    result['FPS'] = Math.round(data.fps);
  }
  
  return result;
}

