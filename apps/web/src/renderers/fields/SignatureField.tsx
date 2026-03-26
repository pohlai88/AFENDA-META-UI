import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 180;

export function SignatureField({ field, value, onChange, readonly }: RendererFieldProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const isDrawingRef = React.useRef(false);

  React.useEffect(() => {
    if (!canvasRef.current || typeof value !== "string" || value.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);
    if (!canvas || !context || !point) return;

    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || readonly) return;
    const context = canvasRef.current?.getContext("2d");
    const point = getPoint(event);
    if (!context || !point) return;

    context.lineTo(point.x, point.y);
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  };

  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      canvas.releasePointerCapture(event.pointerId);
      onChange?.(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || readonly) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange?.("");
  };

  return (
    <FieldWrapper field={field} required={field.required}>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          style={{
            width: "100%",
            maxWidth: CANVAS_WIDTH,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background: readonly ? "#f9fafb" : "#fff",
            touchAction: "none",
            cursor: readonly ? "default" : "crosshair",
          }}
          aria-label={field.label}
        />
        {!readonly && (
          <div>
            <button
              type="button"
              onClick={clearSignature}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff",
                padding: "0.35rem 0.65rem",
                fontSize: "0.85rem",
              }}
            >
              Clear signature
            </button>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
