import { useEffect, useRef } from "react";

const COLORES = ["#D4AF37", "#F2C75C", "#E8B923", "#C99A22"];

type Estrella = { x: number; y: number; r: number; v: number; fase: number; color: string };

export function EstrellasNavidad() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    const ctx = lienzo?.getContext("2d");
    if (!lienzo || !ctx) return;

    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ancho = 0, alto = 0, cuadro = 0, antes = 0;
    let estrellas: Estrella[] = [];

    const dibujar = (ahora: number, animado: boolean) => {
      ctx.clearRect(0, 0, ancho, alto);
      for (const e of estrellas) {
        if (animado) {
          const dt = Math.max(0, Math.min((ahora - (antes || ahora)) / 1000, 0.05));
          e.y += e.v * dt;
          e.x += Math.sin(ahora / 1000 + e.fase) * 10 * dt;
          if (e.y > alto + e.r) { e.y = -e.r; e.x = Math.random() * ancho; }
        }
        ctx.globalAlpha = animado ? 0.72 + 0.28 * Math.sin(ahora / 420 + e.fase) : 0.9;
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - e.r * 1.35);
        ctx.lineTo(e.x + e.r * 0.24, e.y - e.r * 0.24);
        ctx.lineTo(e.x + e.r * 1.35, e.y);
        ctx.lineTo(e.x + e.r * 0.24, e.y + e.r * 0.24);
        ctx.lineTo(e.x, e.y + e.r * 1.35);
        ctx.lineTo(e.x - e.r * 0.24, e.y + e.r * 0.24);
        ctx.lineTo(e.x - e.r * 1.35, e.y);
        ctx.lineTo(e.x - e.r * 0.24, e.y - e.r * 0.24);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const ajustar = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      ancho = window.innerWidth; alto = window.innerHeight;
      lienzo.width = Math.round(ancho * escala); lienzo.height = Math.round(alto * escala);
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      estrellas = Array.from({ length: ancho < 700 ? 26 : 54 }, () => ({
        x: Math.random() * ancho, y: Math.random() * alto, r: 3.5 + Math.random() * 5.5,
        v: 18 + Math.random() * 30, fase: Math.random() * Math.PI * 2,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
      }));
      dibujar(0, false);
    };

    const animar = (ahora: number) => {
      if (document.hidden) { cuadro = 0; return; }
      dibujar(ahora, true); antes = ahora; cuadro = requestAnimationFrame(animar);
    };
    const iniciar = () => {
      if (!movimientoReducido && !document.hidden && cuadro === 0) { antes = 0; cuadro = requestAnimationFrame(animar); }
    };
    const pausar = () => { if (cuadro) cancelAnimationFrame(cuadro); cuadro = 0; antes = 0; };
    const visibilidad = () => document.hidden ? pausar() : iniciar();

    ajustar(); iniciar();
    window.addEventListener("resize", ajustar, { passive: true });
    document.addEventListener("visibilitychange", visibilidad);
    return () => { pausar(); window.removeEventListener("resize", ajustar); document.removeEventListener("visibilitychange", visibilidad); };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-screen w-screen" />;
}
