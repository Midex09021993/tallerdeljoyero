import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, QrCode, X } from "lucide-react";

type DatosJoyaQR = {
  id: string;
  qr_token: string;
  codigo: string;
  nombre: string;
  taller: string;
  metal: string;
  ley: string;
  peso: number | null;
  talla: string;
  piedras: string;
  estado: string;
};

export function QRJoya({ joya, onClose }: { joya: DatosJoyaQR; onClose: () => void }) {
  const [svg, setSvg] = useState("");
  const publicBaseUrl = "https://www.tallerdeljoyero.com";
  const url = `${publicBaseUrl}/joya/${encodeURIComponent(joya.qr_token)}`;

  useEffect(() => {
    let activo = true;
    void QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: { dark: "#111111", light: "#ffffff" },
    }).then((valor) => {
      if (activo) setSvg(valor);
    });
    return () => { activo = false; };
  }, [url]);

  function descargar() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `${joya.codigo}-QR.svg`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  function imprimir() {
    if (!svg) return;
    const ventana = window.open("", "_blank", "width=520,height=720");
    if (!ventana) return;
    ventana.document.write(`<!doctype html><html><head><title>${joya.codigo}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:28px;color:#111}img{width:240px;height:240px}.code{font-size:22px;font-weight:700;letter-spacing:2px;margin:12px 0}.name{font-size:15px}.meta{font-size:12px;color:#555;margin-top:8px}</style></head><body><div class="name">TALLER DEL JOYERO</div><div class="code">${joya.codigo}</div><img src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}" alt="QR ${joya.codigo}" /><div class="name">${escapeHtml(joya.nombre)}</div><div class="meta">Taller: ${escapeHtml(joya.taller)}</div><div class="meta">${escapeHtml([joya.metal, joya.ley, joya.peso != null ? `${joya.peso} g` : "", joya.talla ? `Talla ${joya.talla}` : ""].filter(Boolean).join(" · "))}</div><script>window.onload=()=>window.print();</script></body></html>`);
    ventana.document.close();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gold/20 bg-card shadow-[0_30px_90px_-40px_hsl(var(--gold)/.45)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gold/80">Identificación física</p><h2 className="mt-1 text-lg font-semibold">QR de la joya</h2></div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-border hover:border-gold/30 hover:text-gold"><X className="size-4" /></button>
        </div>
        <div className="p-6 text-center">
          <div className="mx-auto flex size-[280px] items-center justify-center rounded-2xl border border-border bg-white p-4" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-4 font-mono text-lg font-bold tracking-wider text-gold">{joya.codigo}</p>
          <p className="mt-1 text-sm font-semibold">{joya.nombre}</p>
          <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Taller:</span> {joya.taller}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{[joya.metal, joya.ley, joya.peso != null ? `${joya.peso} g` : "", joya.talla ? `Talla ${joya.talla}` : ""].filter(Boolean).join(" · ")}</p>
          <p className="mt-3 text-[10px] leading-4 text-muted-foreground">Al escanearlo se abrirá la ficha pública de identificación de esta joya.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" disabled={!svg} onClick={descargar} className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold disabled:opacity-50"><Download className="size-4" /> Descargar SVG</button>
            <button type="button" disabled={!svg} onClick={imprimir} className="inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/[.08] px-3.5 py-2.5 text-xs font-semibold text-foreground disabled:opacity-50"><Printer className="size-4" /> Imprimir etiqueta</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[caracter] ?? caracter));
}
