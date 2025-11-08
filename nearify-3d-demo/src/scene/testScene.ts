import {
  Group,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  TorusGeometry,
  Vector3,
  Color,
} from 'three';
import { remapPoint } from '../nearify/depthRemap';

/**
 * Create test objects at various depths
 * These will be remapped to compress toward the clarity band
 */
export function makeTestObjects(): Group {
  const g = new Group();
  
  // Helper to create and position objects
  const make = (mesh: Mesh, z: number, x = 0, y = 0) => {
    mesh.position.set(x, y, -z); // -Z forward in Three.js
    g.add(mesh);
  };
  
  // Near object (within band) - Green
  const nearMat = new MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.4,
    metalness: 0.1,
  });
  make(new Mesh(new BoxGeometry(0.2, 0.2, 0.2), nearMat), 0.45, -0.5, 0.1);
  
  // At far point - Cyan (should stay sharp)
  const farPointMat = new MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.3,
    metalness: 0.2,
  });
  make(new Mesh(new SphereGeometry(0.15, 32, 16), farPointMat), 0.50, 0.0, 0.0);
  
  // Far from band (will be remapped) - Blue
  const farMat = new MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.4,
    metalness: 0.1,
  });
  make(new Mesh(new CylinderGeometry(0.1, 0.1, 0.3, 32), farMat), 2.0, 0.5, -0.1);
  
  // Very far (will be compressed strongly) - Purple
  const veryFarMat = new MeshStandardMaterial({
    color: 0x8b5cf6,
    roughness: 0.4,
    metalness: 0.1,
  });
  make(new Mesh(new TorusGeometry(0.15, 0.05, 16, 32), veryFarMat), 4.0, -0.3, 0.2);
  
  // Extremely far (will be compressed to band edge) - Red
  const extremeMat = new MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
    metalness: 0.1,
  });
  make(new Mesh(new BoxGeometry(0.3, 0.3, 0.3), extremeMat), 8.0, 0.2, -0.2);
  
  return g;
}

/**
 * CPU remap helper (simple demo): push each child to remapped depth each frame
 * 
 * NOTE: For production, use GPU vertex shader (see depthRemap.vert stub in docs)
 * This CPU approach is for demonstration and debugging.
 */
export function applyCpuDepthRemap(root: Group, camPos: Vector3): void {
  root.traverse((obj) => {
    if (obj instanceof Mesh) {
      // Store original position if not already stored
      if (!(obj as any).__originalPosition) {
        (obj as any).__originalPosition = obj.position.clone();
      }
      
      const originalPos = (obj as any).__originalPosition as Vector3;
      
      // Transform to eye space (relative to camera)
      const pEye = originalPos.clone().sub(camPos);
      // Three.js camera looks down -Z, so we need to flip Z
      pEye.z = -pEye.z;
      
      // Remap depth
      const remapped = remapPoint(pEye);
      
      // Convert back to world space
      // Flip Z back and add camera position
      const worldPos = new Vector3(remapped.x, remapped.y, -remapped.z).add(camPos);
      
      // Update position
      obj.position.copy(worldPos);
    }
  });
}

/**
 * Reset objects to original positions (disable remap)
 */
export function resetObjectPositions(root: Group): void {
  root.traverse((obj) => {
    if (obj instanceof Mesh && (obj as any).__originalPosition) {
      obj.position.copy((obj as any).__originalPosition);
    }
  });
}

/**
 * Create a ground grid for reference
 */
export function makeGroundGrid(): Mesh {
  const size = 4;
  const divisions = 20;
  const geometry = new BoxGeometry(size, 0.01, size);
  const material = new MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2,
  });
  
  const ground = new Mesh(geometry, material);
  ground.position.y = -0.5;
  
  return ground;
}

