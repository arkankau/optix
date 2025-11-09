interface FixedLettersChartProps {
  scale?: number;
  highlightLine?: number; // Which line to highlight (1-11)
}

export default function FixedLettersChart({ scale = 1, highlightLine }: FixedLettersChartProps) {
  return (
    <div 
      style={{
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        position: 'relative',
      }}
    >
      <img 
        src="/assets/eye-chart.png" 
        alt="Snellen Eye Chart"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          background: '#f5f5f5',
          borderRadius: '0.5rem',
          padding: '1rem',
        }}
      />
      
      {highlightLine && (
        <div style={{
          position: 'absolute',
          left: '0',
          right: '0',
          height: '3px',
          background: 'rgba(59, 130, 246, 0.5)',
          top: `${getLinePosition(highlightLine)}%`,
          transition: 'top 0.3s ease',
        }} />
      )}
    </div>
  );
}

// Approximate positions of each line on the chart
function getLinePosition(line: number): number {
  const positions: Record<number, number> = {
    1: 8,   // E (20/200)
    2: 18,  // F P (20/100)
    3: 28,  // T O Z (20/70)
    4: 37,  // L P E D (20/50)
    5: 45,  // P E C F D (20/40)
    6: 53,  // E D F C Z P (20/30) - green line
    7: 61,  // F E L O P Z D (20/25)
    8: 69,  // D E F P O T E C (20/20) - red line
    9: 77,  // L E F O D P C T
    10: 85, // F D F L T C E O
    11: 92, // F E Z O L C F T D
  };
  return positions[line] || 50;
}

