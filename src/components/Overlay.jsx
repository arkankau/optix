import './Overlay.css';

function Overlay({ sphere, cylinder, axis }) {
  return (
    <div className="overlay-container">
      <div className="parameter-display">
        <div className="parameter-item">
          <span className="parameter-label">Sphere:</span>
          <span className="parameter-value">{sphere.toFixed(2)}</span>
        </div>
        <div className="parameter-item">
          <span className="parameter-label">Cylinder:</span>
          <span className="parameter-value">{cylinder.toFixed(2)}</span>
        </div>
        <div className="parameter-item">
          <span className="parameter-label">Axis:</span>
          <span className="parameter-value">{axis.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  );
}

export default Overlay;

