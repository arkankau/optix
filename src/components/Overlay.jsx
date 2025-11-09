import React, { useEffect, useState } from 'react'
import Glass from './Glass'

// Import calc functions if available
const calculateBlurRadius = (sphere, distanceMeters, pupilDiameter = 4) => {
  const dioptersAbs = Math.abs(sphere);
  const blurDiameterMm = (pupilDiameter / 2) * dioptersAbs * distanceMeters * 1000;
  const mmPerPixel = 0.265;
  return blurDiameterMm / mmPerPixel / 2;
}

const calculateDefocusBlur = (sphere, cylinder, distanceCm, pupilDiameterMm = 4) => {
  const distanceM = distanceCm / 100;
  const blurH = (pupilDiameterMm * Math.abs(sphere) * distanceM);
  const blurV = (pupilDiameterMm * Math.abs(sphere + cylinder) * distanceM);
  return { horizontal: blurH, vertical: blurV, averageBlur: (blurH + blurV) / 2 };
}

const calculateSphericalEquivalent = (sphere, cylinder) => {
  return sphere + (cylinder / 2);
}

export default function Overlay({ sphere, cylinder, axis, distance }) {
  const [calculations, setCalculations] = useState(null)

  useEffect(() => {
    // Calculate all optical parameters
    const blurRadius = calculateBlurRadius(sphere, distance / 100);
    const defocusBlur = calculateDefocusBlur(sphere, cylinder, distance);
    const sphericalEq = calculateSphericalEquivalent(sphere, cylinder);
    const sigmaH = defocusBlur.horizontal / 2.5;
    const sigmaV = defocusBlur.vertical / 2.5;

    const calc = {
      sphere,
      cylinder,
      axis,
      distance,
      blurRadius,
      sigmaH,
      sigmaV,
      sphericalEquivalent: sphericalEq,
      defocusBlur
    };

    setCalculations(calc);
    
    if (window.electronAPI) {
      window.electronAPI.log(`📊 Calculations: Sphere=${sphere.toFixed(2)}D, Cyl=${cylinder.toFixed(2)}D, Axis=${axis}°, Dist=${distance}cm, BlurRadius=${blurRadius.toFixed(2)}px, SigmaH=${sigmaH.toFixed(2)}`);
    }
  }, [sphere, cylinder, axis, distance])

  // Calculate color temperature and transparency based on optical parameters
  // Higher spherical equivalent (more myopic) -> cooler/bluer tint
  // Higher blur -> more opacity
  const getBackgroundStyle = () => {
    if (!calculations) return 'rgba(50, 50, 50, 0.5)';
    
    const { sphericalEquivalent, blurRadius } = calculations;
    
    // Map spherical equivalent to color temperature (-20 to 0 diopters)
    // More negative = more myopic = cooler/bluer (higher blue value)
    // Less negative = less myopic = warmer/redder (higher red value)
    const seNormalized = Math.max(-20, Math.min(0, sphericalEquivalent)); // Clamp to -20 to 0
    const tempRatio = (seNormalized + 20) / 20; // 0 (very myopic) to 1 (no myopia)
    
    // Color temperature: blue when myopic, red when less myopic
    const red = 0; // 50-150
    const green = 0; // Keep constant
    const blue = 0; // 150-50
    
    // Map blur radius to opacity (0-50 pixels -> 0.3-0.7 opacity)
    const blurNormalized = Math.max(0, Math.min(50, blurRadius)); // Clamp to 0-50
    const opacity = 0.3 + (blurNormalized / 50) * 0.4; // 0.3 to 0.7
    
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: getBackgroundStyle(), 
      overflow: 'hidden', 
      pointerEvents: 'none',
      position: 'relative'
    }}>
      {/* <Glass></Glass> */}
      {/* Top-left display */}
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        left: 10, 
        background: 'rgba(0,0,0,0.5)', 
        color: 'white', 
        padding: '12px 16px', 
        borderRadius: 8, 
        fontSize: 14,
        fontFamily: 'monospace',
        border: '1px solid rgba(0,255,0,0.3)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        minWidth: 280
      }}>
        {/* <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16, color: '#00ffff' }}>
          🔬 Optical Parameters
        </div> */}
        {calculations && (
          <div style={{ lineHeight: 1.8 }}>
            <div>Sphere: <span style={{ color: '#ffff00' }}>{calculations.sphere.toFixed(2)} D</span></div>
            <div>Cylinder: <span style={{ color: '#ffff00' }}>{calculations.cylinder.toFixed(2)} D</span></div>
            <div>Axis: <span style={{ color: '#ffff00' }}>{calculations.axis}°</span></div>
            <div>Distance: <span style={{ color: '#ffff00' }}>{calculations.distance} cm</span></div>
            
          </div>
        )}
      </div>

      {/* Status indicator top-right */}
      {/* Top-right display */}
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        background: 'rgba(0,0,0,0.5)', 
        color: 'white', 
        padding: '12px 16px', 
        borderRadius: 8, 
        fontSize: 14,
        fontFamily: 'monospace',
        border: '1px solid rgba(0,255,0,0.3)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        minWidth: 280
      }}>
        {calculations && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,255,0,0.2)' }}>
            <div>Spherical Eq: <span style={{ color: '#ff9900' }}>{calculations.sphericalEquivalent.toFixed(2)} D</span></div>
            <div>Blur Radius: <span style={{ color: '#ff9900' }}>{calculations.blurRadius.toFixed(2)} px</span></div>
            <div>Sigma H: <span style={{ color: '#ff9900' }}>{calculations.sigmaH.toFixed(2)}</span></div>
            <div>Sigma V: <span style={{ color: '#ff9900' }}>{calculations.sigmaV.toFixed(2)}</span></div>
            <div>Avg Blur: <span style={{ color: '#ff9900' }}>{calculations.defocusBlur.averageBlur.toFixed(2)}</span></div>
          </div>
        )}
      </div>
    </div>
  )
}

