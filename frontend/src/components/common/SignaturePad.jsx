import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * A minimal, dependency-free signature pad. Draws on an HTML canvas
 * with mouse or touch input and exposes an imperative API via ref:
 *
 *   const padRef = useRef(null);
 *   <SignaturePad ref={padRef} onChange={(isEmpty) => ...} />
 *   padRef.current.clear();
 *   padRef.current.isEmpty();       // true until a stroke is drawn
 *   padRef.current.toDataURL();     // "data:image/png;base64,..."
 *
 * The canvas is drawn at a fixed internal resolution and scaled to
 * whatever CSS size the parent gives it, so strokes stay crisp and
 * line up correctly regardless of display size.
 */
const SignaturePad = forwardRef(function SignaturePad(
  { className = "", width = 600, height = 200, onChange },
  ref,
) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.25;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b"; // slate-800, matches the printed DTR ink color
  }, []);

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStrokeRef.current = false;
      onChange?.(true);
    },
    isEmpty() {
      return !hasStrokeRef.current;
    },
    toDataURL() {
      return canvasRef.current.toDataURL("image/png");
    },
  }));

  function getPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function start(e) {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  }

  function move(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const point = getPoint(e);
    const last = lastPointRef.current;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;

    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      onChange?.(false);
    }
  }

  function end(e) {
    if (e) e.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`touch-none cursor-crosshair bg-white ${className}`}
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      onTouchCancel={end}
    />
  );
});

export default SignaturePad;
