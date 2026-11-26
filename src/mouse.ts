export const pos = {
  ndcX: 0,
  ndcY: 0,
  isOverCanvas: false,
};

const buttonsHeld = new Set<number>();
const buttonsDown = new Set<number>();
const buttonsUp = new Set<number>();

export function initMouseInput(canvas: HTMLCanvasElement): () => void {
  const updatePosition = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pos.ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pos.ndcY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
  };

  const onMove = (e: PointerEvent) => {
    updatePosition(e);
    pos.isOverCanvas = true;
  };

  const onDown = (e: PointerEvent) => {
    updatePosition(e);
    pos.isOverCanvas = true;
    if (!buttonsHeld.has(e.button)) {
      buttonsDown.add(e.button);
    }
    buttonsHeld.add(e.button);
  };

  const onUp = (e: PointerEvent) => {
    if (buttonsHeld.has(e.button)) {
      buttonsUp.add(e.button);
    }
    buttonsHeld.delete(e.button);
  };

  const onLeave = () => {
    pos.isOverCanvas = false;
  };

  const onBlur = () => {
    buttonsHeld.clear();
  };

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerleave', onLeave);
  // Listen on window so releasing outside the canvas still registers
  window.addEventListener('pointerup', onUp);
  window.addEventListener('blur', onBlur);

  return () => {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('blur', onBlur);
    buttonsHeld.clear();
    buttonsDown.clear();
    buttonsUp.clear();
  };
}

// Button indices: 0 = Left, 1 = Middle, 2 = Right
export function getMouseButton(button = 0): boolean {
  return buttonsHeld.has(button);
}

export function getMouseButtonDown(button = 0): boolean {
  return buttonsDown.has(button);
}

export function getMouseButtonUp(button = 0): boolean {
  return buttonsUp.has(button);
}

// Call once at the end of every frame
export function endInputFrame(): void {
  buttonsDown.clear();
  buttonsUp.clear();
}

