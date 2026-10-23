import { useEffect, useRef } from 'react';
import { create } from 'canvas-confetti';
import { COLORS } from './roulette';

export default function Confetti({ celebrationId }: { celebrationId: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!celebrationId || !canvas.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const burst = create(canvas.current, { resize: true, disableForReducedMotion: true });
    const options = { colors: [...COLORS, '#d9ef98'], particleCount: 100, spread: 70, startVelocity: 48, ticks: 220, gravity: 0.95 };
    void burst({ ...options, angle: 60, origin: { x: 0, y: 0.7 } });
    void burst({ ...options, angle: 120, origin: { x: 1, y: 0.7 } });

    return () => { burst.reset(); };
  }, [celebrationId]);

  return <canvas ref={canvas} className="confetti-canvas" aria-hidden="true" />;
}
