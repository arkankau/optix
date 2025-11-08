import { useMemo } from 'react';

interface AstigmatismImageProps {
  scale?: number;
}

// Classic astigmatism test patterns
const ASTIGMATISM_PATTERNS = [
  // Radial lines (clock dial)
  'radial',
  // Cross pattern
  'cross',
  // Fan and block
  'fan',
] as const;

export default function AstigmatismImage({ scale = 1 }: AstigmatismImageProps) {
  const pattern = useMemo(() => {
    // Randomly select a pattern for each test
    return ASTIGMATISM_PATTERNS[Math.floor(Math.random() * ASTIGMATISM_PATTERNS.length)];
  }, []);

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      transform: `scale(${scale})`,
      transformOrigin: 'center',
    }}>
      {pattern === 'radial' && <RadialPattern />}
      {pattern === 'cross' && <CrossPattern />}
      {pattern === 'fan' && <FanPattern />}
    </div>
  );
}

function RadialPattern() {
  return (
    <svg width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#000" />
      <g transform="translate(200, 200)">
        {/* Clock dial - 12 radial lines */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x2 = Math.cos(angle) * 150;
          const y2 = Math.sin(angle) * 150;
          return (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={x2}
              y2={y2}
              stroke="#fff"
              strokeWidth="3"
            />
          );
        })}
        {/* Center circle */}
        <circle r="20" fill="#fff" />
      </g>
      <text x="200" y="380" textAnchor="middle" fill="#888" fontSize="14">
        Focus on the center. Do all lines appear equally sharp?
      </text>
    </svg>
  );
}

function CrossPattern() {
  return (
    <svg width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#000" />
      {/* Vertical lines */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={50 + i * 40}
          y1="50"
          x2={50 + i * 40}
          y2="350"
          stroke="#fff"
          strokeWidth="2"
        />
      ))}
      {/* Horizontal lines */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="50"
          y1={50 + i * 40}
          x2="350"
          y2={50 + i * 40}
          stroke="#fff"
          strokeWidth="2"
        />
      ))}
      <text x="200" y="380" textAnchor="middle" fill="#888" fontSize="14">
        Which lines appear darker or blurrier?
      </text>
    </svg>
  );
}

function FanPattern() {
  return (
    <svg width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#000" />
      <g transform="translate(200, 200)">
        {/* Fan of lines at different angles */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          const x2 = Math.cos(angle) * 150;
          const y2 = Math.sin(angle) * 150;
          return (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={x2}
              y2={y2}
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        <circle r="15" fill="#fff" />
      </g>
      <text x="200" y="380" textAnchor="middle" fill="#888" fontSize="14">
        Which section appears clearest?
      </text>
    </svg>
  );
}



