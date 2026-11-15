/**
 * Creates a runtime-enforced ReadonlyMap facade.
 *
 * Object.freeze(new Map()) does not disable Map.prototype.set/delete/clear.
 * This facade exposes only the ReadonlyMap surface and keeps the backing Map
 * private, so adapter contracts remain read-only at runtime as well as in TS.
 */
export function createAurumReadonlyMap<K, V>(
  source: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  const snapshot = new Map(source);

  const readonlyMap: ReadonlyMap<K, V> = {
    get size() {
      return snapshot.size;
    },
    get(key: K) {
      return snapshot.get(key);
    },
    has(key: K) {
      return snapshot.has(key);
    },
    entries() {
      return snapshot.entries();
    },
    keys() {
      return snapshot.keys();
    },
    values() {
      return snapshot.values();
    },
    forEach(callbackfn, thisArg) {
      snapshot.forEach((value, key) => callbackfn.call(thisArg, value, key, readonlyMap));
    },
    [Symbol.iterator]() {
      return snapshot[Symbol.iterator]();
    },
  } as ReadonlyMap<K, V>;
  Object.defineProperty(readonlyMap, Symbol.toStringTag, { get: () => "ReadonlyMap" });

  return Object.freeze(readonlyMap);
}
