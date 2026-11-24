import { useEffect, useRef } from 'react';
import { startScene } from './startScene';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();
    let dispose: (() => void) | undefined;

    void startScene(canvas, controller.signal)
      .then((cleanup) => {
        if (controller.signal.aborted) cleanup();
        else dispose = cleanup;
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error(error);
      });

    return () => {
      controller.abort();
      dispose?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}