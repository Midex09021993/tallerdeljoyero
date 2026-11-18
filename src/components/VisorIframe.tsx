interface Props {
  url: string;
  titulo: string;
  alto?: string;
}

// Visor 3D realista incrustado (iJewel u otros que permitan iframe).
export function VisorIframe({ url, titulo, alto = "aspect-video" }: Props) {
  return (
    <iframe
      title={titulo}
      src={url}
      className={`w-full rounded-xl border border-border bg-black ${alto}`}
      frameBorder={0}
      allow="camera; autoplay; fullscreen; xr-spatial-tracking; web-share"
      allowFullScreen
      // @ts-expect-error atributos no estándar requeridos por iJewel
      mozallowfullscreen="true"
      webkitallowfullscreen="true"
      xr-spatial-tracking="true"
      execution-while-out-of-viewport="true"
      execution-while-not-rendered="true"
      web-share="true"
    />
  );
}
