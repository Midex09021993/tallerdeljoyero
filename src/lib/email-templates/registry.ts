import type { ComponentType } from 'react'
import { ContactoAdminEmail, ContactoVisitanteEmail } from './contacto-comercial'

export interface TemplateEntry {
  component: ComponentType<Record<string, unknown>>
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  previewData?: Record<string, unknown>
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
  'contacto-admin': {
    component: ContactoAdminEmail,
    subject: (data) => `Nueva consulta web: ${String(data['nombre'] || 'visitante')}`,
    displayName: 'Nueva consulta comercial',
    to: 'mgld_09@hotmail.com',
    previewData: { nombre: 'María', email: 'maria@example.com', interes: 'aurum_lab', mensaje: 'Quisiera conocer más información.' },
  },
  'contacto-visitante': {
    component: ContactoVisitanteEmail,
    subject: 'Hemos recibido tu consulta | Taller del Joyero',
    displayName: 'Confirmación de consulta comercial',
    previewData: { nombre: 'María', interes: 'aurum_lab' },
  },
  // Add templates here as they are created, e.g.:
  // 'welcome': welcomeTemplate,
}
