import { useState } from 'react';
import './ControlBar.css';

function ControlBar({
  sphere,
  cylinder,
  axis,
  setSphere,
  setCylinder,
  setAxis,
  overlayVisible,
  onToggleOverlay,
  onClose
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 });

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('control-bar-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="control-bar-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="control-bar-header" onMouseDown={handleMouseDown}>
        <h3>Optical Parameters Control</h3>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="control-bar-content">
        <div className="control-group">
          <label className="control-label">
            <span>Sphere</span>
            <span className="control-value">{sphere.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="-20"
            max="20"
            step="0.25"
            value={sphere}
            onChange={(e) => setSphere(parseFloat(e.target.value))}
            className="slider"
          />
          <div className="range-labels">
            <span>-20.00</span>
            <span>20.00</span>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Cylinder</span>
            <span className="control-value">{cylinder.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="-10"
            max="10"
            step="0.25"
            value={cylinder}
            onChange={(e) => setCylinder(parseFloat(e.target.value))}
            className="slider"
          />
          <div className="range-labels">
            <span>-10.00</span>
            <span>10.00</span>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">
            <span>Axis</span>
            <span className="control-value">{axis.toFixed(0)}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="180"
            step="1"
            value={axis}
            onChange={(e) => setAxis(parseFloat(e.target.value))}
            className="slider"
          />
          <div className="range-labels">
            <span>0°</span>
            <span>180°</span>
          </div>
        </div>

        <div className="control-actions">
          <button
            className={`toggle-button ${overlayVisible ? 'active' : ''}`}
            onClick={onToggleOverlay}
          >
            {overlayVisible ? 'Hide Overlay' : 'Show Overlay'}
          </button>
        </div>

        <div className="shortcuts-info">
          <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> - Toggle Control Bar</p>
          <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>W</kbd> - Close App</p>
        </div>
      </div>
    </div>
  );
}

export default ControlBar;

