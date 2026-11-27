import { useEffect, useRef } from "react";

const COLORES = ["#FFD700", "#F6DC93", "#FFFFFF", "#D4AF37"];

export function EstrellasNavidad() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    const ctx = lienzo?.getContext("2d");
    if (!lienzo || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ancho = 0;
    let alto = 0;
    let cuadro = 0;
    let antes = 0;

    const ajustar = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      ancho = window.innerWidth;
      alto = window.innerHeight;
      lienzo.width = Math.round(ancho * escala);
      lienzo.height = Math.round(alto * escala);
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
    };

    ajustar();
    const cantidad = ancho < 700 ? 25 : 60;
    const estrellas = Array.from({ length: cantidad }, () => ({
      x: Math.random() * ancho,
      y: Math.random() * alto,
      r: 3 + Math.random() * 6,
      v: 20 + Math.random() * 40,
      fase: Math.random() * Math.PI * 2,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
    }));

    const animar = (ahora: number) => {
      if (document.hidden) {
        cuadro = 0;
        return;
      }
      const dt = Math.max(0, Math.min((ahora - (antes || ahora)) / 1000, 0.05));
      antes = ahora;
      ctx.clearRect(0, 0, ancho, alto);
      for (const e of estrellas) {
        e.y += e.v * dt;
        e.x += Math.sin(ahora / 1000 + e.fase) * 12 * dt;
        if (e.y > alto + e.r) {
          e.y = -e.r;
          e.x = Math.random() * ancho;
        }
        const { x, y, r } = e;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(ahora / 350 + e.fase);
        ctx.fillStyle = e.color;
        ctx.shadowColor = "#D4AF37";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.quadraticCurveTo(x, y, x, y + r);
        ctx.quadraticCurveTo(x, y, x - r, y);
        ctx.quadraticCurveTo(x, y, x, y - r);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      cuadro = requestAnimationFrame(animar);
    };

    const iniciar = () => {
      if (!document.hidden && cuadro === 0) {
        antes = 0;
        cuadro = requestAnimationFrame(animar);
      }
    };
    const pausar = () => {
      if (cuadro) cancelAnimationFrame(cuadro);
      cuadro = 0;
      antes = 0;
    };
    const visibilidad = () => document.hidden ? pausar() : iniciar();

    iniciar();
    window.addEventListener("resize", ajustar, { passive: true });
    document.addEventListener("visibilitychange", visibilidad);
    return () => {
      pausar();
      window.removeEventListener("resize", ajustar);
      document.removeEventListener("visibilitychange", visibilidad);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[40] h-screen w-screen" />;
}
