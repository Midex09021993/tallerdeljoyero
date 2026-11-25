/**
 * Configuración editorial de niveles del directorio AURUM LAB.
 * Los valores son el esquema acordado; no se muestran niveles hasta que
 * la fuente segura de actividad y verificación esté disponible.
 */
export const DIRECTORIO_RANKING_CONFIG = {
  weights: {
    profileComplete: 30,
    publishedProducts: 25,
    recentActivity: 25,
    verified: 20,
  },
  thresholds: {
    bronze: 30,
    silver: 60,
    gold: 80,
    diamondTopPerCategory: 3,
  },
  activityWindowDays: 30,
  downgradeGraceDays: 7,
  productScaleMax: 10,
  profileFields: ["logo", "description", "country", "contact", "category"] as const,
} as const;

export type DirectorioLevel = "none" | "bronze" | "silver" | "gold" | "diamond";
