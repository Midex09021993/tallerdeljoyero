import { supabase } from "@/integrations/supabase/client";

/** Limpia el nombre para que Storage lo acepte (sin tildes ni caracteres raros). */
export function nombreSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-120);
}

/**
 * Sube un archivo a Storage con progreso real usando una URL firmada de subida
 * (soporta archivos pesados como STL/3MF).
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
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(ruta);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "No se pudo preparar la subida.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgreso?.(100);
        resolve();
      } else {
        reject(new Error(`Error ${xhr.status}: ${xhr.responseText || "subida rechazada"}`));
      }
    };
    xhr.onerror = () => reject(new Error("Fallo de red al subir el archivo."));
    xhr.send(file);
  });

  return ruta;
}
