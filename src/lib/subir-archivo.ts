import { supabase } from "@/integrations/supabase/client";

/**
 * Sube un archivo a Storage con progreso real (XHR) para archivos pesados (STL/3MF).
 * Devuelve la ruta creada dentro del bucket.
 */
export async function subirConProgreso({
  bucket,
  ruta,
  file,
  onProgreso,
}: {
  bucket: string;
  ruta: string;
  file: File;
  onProgreso?: (porcentaje: number) => void;
}): Promise<string> {
  const base = import.meta.env["VITE_SUPABASE_URL"] as string;
  const anon = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? anon;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/${bucket}/${encodeURI(ruta)}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anon);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgreso?.(100);
        resolve();
      } else {
        reject(new Error(`Error al subir (${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Fallo de red al subir el archivo."));
    xhr.send(file);
  });

  return ruta;
}
