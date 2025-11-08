import { useEffect, useRef } from 'react';

interface OptotypeCanvasProps {
  letters: string[];
  sizePx: number;
  spacing?: number;
}

export default function OptotypeCanvas({ letters, sizePx, spacing = 1.5 }: OptotypeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw letters
    ctx.fillStyle = '#f9fafb';
    ctx.font = `${sizePx}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const totalWidth = letters.length * sizePx * spacing;
    const startX = (canvas.width - totalWidth) / 2 + (sizePx * spacing) / 2;
    const y = canvas.height / 2;

    letters.forEach((letter, i) => {
      const x = startX + i * sizePx * spacing;
      ctx.fillText(letter, x, y);
    });
  }, [letters, sizePx, spacing]);

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={400}
      style={{
        width: '100%',
        maxWidth: '1200px',
        height: 'auto',
        background: '#0a0a0b',
        borderRadius: '0.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    />
  );
}


