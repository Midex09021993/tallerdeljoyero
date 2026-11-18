/**
 * AURUM MEDIA ENGINE — export session cleanup coordinator.
 *
 * Restores each captured production resource independently. A failed cleanup
 * must never prevent camera, renderer, composer, controls or viewer-loop
 * restoration steps that follow it.
 */
export type AurumMediaExportCleanup = () => void;

export function runAurumMediaExportCleanup(
  cleanups: readonly AurumMediaExportCleanup[],
): readonly unknown[] {
  const failures: unknown[] = [];
  for (const cleanup of cleanups) {
    try { cleanup(); } catch (error) { failures.push(error); }
  }
  return failures;
}