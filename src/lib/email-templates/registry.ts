import type { ComponentType } from 'react'

type TemplateData = Record<string, unknown>

export interface TemplateEntry {
  component: ComponentType<TemplateData>
  subject: string | ((data: TemplateData) => string)
  displayName?: string
  previewData?: TemplateData
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  // Add templates here as they are created, e.g.:
  // 'welcome': welcomeTemplate,
}
