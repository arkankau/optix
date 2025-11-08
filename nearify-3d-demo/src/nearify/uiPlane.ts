import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TextureLoader,
  CanvasTexture,
  LinearFilter,
} from 'three';
import { NEARIFY_CFG } from './config';

/**
 * Create a mono UI plane pinned at zCenter for both eyes
 * This ensures the UI is always at the far point (0.50m for -2D)
 * and appears sharp without correction.
 * 
 * @param wDeg Width in degrees of visual angle
 * @param hDeg Height in degrees of visual angle
 * @param color Base color (if no texture)
 * @returns UI plane mesh
 */
export function makeUIPlane(wDeg = 30, hDeg = 18, color = 0x334155): Mesh {
  const { zCenter } = NEARIFY_CFG;
  
  // Convert degrees to meters at zCenter
  const rad = Math.PI / 180;
  const W = 2 * zCenter * Math.tan((wDeg * rad) / 2);
  const H = 2 * zCenter * Math.tan((hDeg * rad) / 2);

  const geo = new PlaneGeometry(W, H);
  const mat = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    side: 2, // DoubleSide
  });
  
  const plane = new Mesh(geo, mat);
  
  // Three.js uses -Z forward for cameras
  plane.position.z = -zCenter;
  
  return plane;
}

/**
 * Create a UI plane with text content
 * Renders text to a canvas and uses it as a texture
 */
export function makeTextUIPlane(text: string, wDeg = 30, hDeg = 18): Mesh {
  const plane = makeUIPlane(wDeg, hDeg);
  
  // Create canvas texture with text
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  // Background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Border
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  // Text
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Apply texture
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  
  const mat = plane.material as MeshBasicMaterial;
  mat.map = texture;
  mat.color.setHex(0xffffff);
  mat.needsUpdate = true;
  
  return plane;
}

/**
 * Update UI plane text (if it has a canvas texture)
 */
export function updateUIPlaneText(plane: Mesh, text: string): void {
  const mat = plane.material as MeshBasicMaterial;
  if (!mat.map || !(mat.map instanceof CanvasTexture)) return;
  
  const texture = mat.map as CanvasTexture;
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  
  // Clear and redraw
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  texture.needsUpdate = true;
}

