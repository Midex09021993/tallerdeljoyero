/**
 * Cola local de archivos para futuras subidas reanudables de la PWA.
 *
 * Solo guarda archivos que el usuario haya seleccionado explícitamente.
 * No escanea la galería ni inicia subidas en segundo plano por sí sola.
 * Los registros se separan por usuario autenticado y nunca contienen tokens.
 */
export type EstadoColaArchivo = "pendiente" | "subiendo" | "error";

export type ArchivoEnCola = {
  id: string;
  usuarioId: string;
  nombre: string;
  tipo: string;
  tamano: number;
  modificado: number;
  creado: number;
  estado: EstadoColaArchivo;
  intentos: number;
  ultimoError: string | null;
  blob: Blob;
};

type RegistroCola = ArchivoEnCola;

const DB_NAME = "taller-del-joyero-upload-queue";
const DB_VERSION = 1;
const STORE_NAME = "archivos";

function abrirBaseDatos(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador no admite almacenamiento local de la cola."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("usuarioId", "usuarioId", { unique: false });
        store.createIndex("usuarioCreado", ["usuarioId", "creado"], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir la cola local."));
    request.onblocked = () => reject(new Error("Cierra otras pestañas de la aplicación para actualizar la cola local."));
  });
}

function ejecutar<T>(
  modo: IDBTransactionMode,
  operacion: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason: Error) => void) => void,
): Promise<T> {
  return abrirBaseDatos().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, modo);
    operacion(tx.objectStore(STORE_NAME), resolve, reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Falló una operación de la cola local."));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Se canceló una operación de la cola local."));
    };
  }));
}

function errorComoError(value: DOMException | null | undefined, mensaje: string) {
  if (value?.name === "QuotaExceededError") {
    return new Error("No queda suficiente espacio local en el dispositivo. Libera espacio e inténtalo de nuevo.");
  }
  return new Error(value?.message || mensaje);
}

/** Guarda un archivo elegido por el usuario para poder reintentar su subida. */
export async function encolarArchivo(usuarioId: string, file: File): Promise<ArchivoEnCola> {
  if (!usuarioId.trim()) throw new Error("Inicia sesión antes de preparar archivos para subir.");
  if (!(file instanceof Blob)) throw new Error("El archivo seleccionado no es válido.");
  if (file.size <= 0) throw new Error("El archivo está vacío.");
  const registro: ArchivoEnCola = {
    id: crypto.randomUUID(),
    usuarioId,
    nombre: file.name,
    tipo: file.type || "application/octet-stream",
    tamano: file.size,
    modificado: file.lastModified || Date.now(),
    creado: Date.now(),
    estado: "pendiente",
    intentos: 0,
    ultimoError: null,
    blob: file,
  };

  return ejecutar("readwrite", (store, resolve, reject) => {
    const request = store.add(registro);
    request.onsuccess = () => resolve(registro);
    request.onerror = () => reject(errorComoError(request.error, "No se pudo guardar el archivo en la cola local."));
  });
}

/** Lista solo los archivos de la cuenta autenticada indicada por el llamador. */
export async function listarColaArchivos(usuarioId: string): Promise<ArchivoEnCola[]> {
  if (!usuarioId.trim()) return [];
  return ejecutar("readonly", (store, resolve, reject) => {
    const request = store.index("usuarioCreado").getAll(IDBKeyRange.bound([usuarioId, 0], [usuarioId, Number.MAX_SAFE_INTEGER]));
    request.onsuccess = () => resolve((request.result as RegistroCola[]).sort((a, b) => a.creado - b.creado));
    request.onerror = () => reject(errorComoError(request.error, "No se pudo consultar la cola local."));
  });
}

/** Actualiza el estado de un registro sin cambiar su archivo ni su propietario. */
export async function actualizarEstadoCola(
  usuarioId: string,
  id: string,
  cambio: { estado: EstadoColaArchivo; ultimoError?: string | null; sumarIntento?: boolean },
): Promise<void> {
  if (!usuarioId.trim()) throw new Error("No se pudo identificar la cuenta de la cola.");
  return ejecutar("readwrite", (store, resolve, reject) => {
    const get = store.get(id);
    get.onerror = () => reject(errorComoError(get.error, "No se pudo leer el archivo de la cola."));
    get.onsuccess = () => {
      const actual = get.result as RegistroCola | undefined;
      if (!actual || actual.usuarioId !== usuarioId) {
        reject(new Error("El archivo no existe en la cola de esta cuenta."));
        return;
      }
      const actualizado: RegistroCola = {
        ...actual,
        estado: cambio.estado,
        ultimoError: cambio.ultimoError ?? null,
        intentos: actual.intentos + (cambio.sumarIntento ? 1 : 0),
      };
      const put = store.put(actualizado);
      put.onsuccess = () => resolve();
      put.onerror = () => reject(errorComoError(put.error, "No se pudo actualizar el estado del archivo."));
    };
  });
}

/** Elimina únicamente un registro perteneciente a la cuenta indicada. */
export async function quitarDeCola(usuarioId: string, id: string): Promise<void> {
  if (!usuarioId.trim()) throw new Error("No se pudo identificar la cuenta de la cola.");
  return ejecutar("readwrite", (store, resolve, reject) => {
    const get = store.get(id);
    get.onerror = () => reject(errorComoError(get.error, "No se pudo leer el archivo de la cola."));
    get.onsuccess = () => {
      const actual = get.result as RegistroCola | undefined;
      if (!actual) {
        resolve();
        return;
      }
      if (actual.usuarioId !== usuarioId) {
        reject(new Error("No puedes eliminar un archivo de la cola de otra cuenta."));
        return;
      }
      const del = store.delete(id);
      del.onsuccess = () => resolve();
      del.onerror = () => reject(errorComoError(del.error, "No se pudo quitar el archivo de la cola."));
    };
  });
}
